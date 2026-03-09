import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { Animated, Easing } from 'react-native';
import { ChevronLeft, Activity, Target, TrendingUp } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useUser } from "@/context/UserContext";
import { getUserProfile } from "@/config/users";
import { auth } from "@/config/firebase";
import { API_BASE_URL } from "@/config/api";
import { formatSurgeryMonthYear, calculatePostOpTime } from "@/utils/formatters";
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';
import { PinchGestureHandler, State as GestureState, GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

type PatientData = {
  id: string;
  name: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
  surgeryType?: string | null;
  surgeryDate?: string | null;
  currentWeight?: number | null;
  startingWeight?: number | null;
  goalWeight?: number | null;
  proteinGoal?: number | null;
  fluidGoal?: number | null;
  calorieGoal?: number | null;
  notes?: string | null;
};

export default function SpecificPatient() {
  const { id } = useLocalSearchParams();
  const patientId = String(id || "");
  const { userProfile, setUserProfile } = useUser();
  const isDoctor = Boolean(auth.currentUser);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [todayProtein, setTodayProtein] = useState<number | null>(null);
  const [todayCalories, setTodayCalories] = useState<number | null>(null);
  const [todayFluids, setTodayFluids] = useState<number | null>(null);
  const [metric, setMetric] = useState<'nutrition' | 'weight'>('weight');
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [history, setHistory] = useState<Array<{ date: string; protein?: number | null; calories?: number | null; fluids?: number | null; weight?: number | null }>>([]);
  const [todaysWeight, setTodaysWeight] = useState<number | null>(null);
  const [preservedCurrentWeight, setPreservedCurrentWeight] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [nutrient, setNutrient] = useState<'calories'|'protein'|'fluids'>('calories');
  const [zoomWindow, setZoomWindow] = useState<number | null>(null); // null = all
  const [showNumbers, setShowNumbers] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalData, setModalData] = useState<Array<number | null>>([]);
  const [modalGoal, setModalGoal] = useState<number | null>(null);
  const [modalTotal, setModalTotal] = useState(0);
  const [modalZoom, setModalZoom] = useState<number>(1);
  const [modalOffset, setModalOffset] = useState<number>(0);
  const modalZoomAnim = useRef(new Animated.Value(1)).current;
  const modalOffsetAnim = useRef(new Animated.Value(0)).current;
  const modalZoomRef = useRef<number>(1);
  const modalOffsetRef = useRef<number>(0);
  const decayAnimRef = useRef<any>(null);
  const PINCH_SENSITIVITY = 0.25;
  const PINCH_SMOOTH = 0.25;
  const PAN_SMOOTH = 0.25;
  const lastTapRef = useRef<number>(0);
  const modalTranslateYAnim = useRef(new Animated.Value(0)).current;
  const panActiveRef = useRef(false);
  const panStartOffsetRef = useRef(0);
  const [modalHighlightIndex, setModalHighlightIndex] = useState<number | null>(null);
  const [modalShowAllNumbers, setModalShowAllNumbers] = useState(false);
  const [inlineOffset, setInlineOffset] = useState(0);
  const inlineOffsetRef = useRef<number>(0);
  const inlinePanStartXRef = useRef<number | null>(null);
  const inlinePanStartOffsetRef = useRef<number>(0);
  // Inline pan using gesture handler for more reliable swipes
  const onInlinePanGestureEvent = (e: any, total: number, chartWidth: number) => {
    try {
      const tx = e.nativeEvent.translationX ?? 0;
      const visible = (zoomWindow && total > zoomWindow) ? zoomWindow : Math.max(1, total);
      const per = chartWidth / Math.max(1, visible);
      const deltaIdx = Math.round(tx / per);
      const maxOffset = Math.max(0, total - visible);
      const raw = Math.max(0, Math.min(maxOffset, (inlinePanStartOffsetRef.current || inlineOffset) - deltaIdx));
      inlineOffsetRef.current = raw;
      setInlineOffset(raw);
    } catch (err) {
      console.error('inline pan gesture', err);
    }
  };

  const onInlinePanHandlerStateChange = (e: any) => {
    try {
      if (e.nativeEvent.state === GestureState.BEGAN) {
        inlinePanStartOffsetRef.current = inlineOffsetRef.current || inlineOffset;
      }
      if (e.nativeEvent.state === GestureState.END || e.nativeEvent.state === GestureState.CANCELLED) {
        inlinePanStartOffsetRef.current = inlineOffsetRef.current || inlineOffset;
      }
    } catch (err) {
      console.error('inline pan state change', err);
    }
  };

  useEffect(() => {
    // clamp inline offset when history or zoomWindow changes
    const total = history.length;
    const maxOffset = (zoomWindow && total > zoomWindow) ? (total - zoomWindow) : 0;
    inlineOffsetRef.current = Math.max(0, Math.min(inlineOffsetRef.current || 0, maxOffset));
    setInlineOffset(inlineOffsetRef.current || 0);
  }, [history.length, zoomWindow]);

  const handleBack = () => {
    router.back();
  };

  const handleUnassign = async () => {
    Alert.alert(
      "Remove patient",
      "Are you sure you want to remove this patient from your care?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
              try {
              const user = auth.currentUser;
              if (!user) throw new Error("Not authenticated");
              // Force refresh token to ensure custom claims (doctor) are present
              const idToken = await user.getIdToken(true);
              const resp = await fetch(`${API_BASE_URL}/api/doctor/unassign`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ patientId }),
              });
              if (!resp.ok) {
                const j = await resp.json().catch(() => ({}));
                const msg = j?.error || "Failed to remove patient";
                console.error('Failed to unassign patient:', msg);
                Alert.alert('Error', msg);
                return;
              }
              // Refresh local user profile so dashboard reflects assignment changes immediately
              try {
                const me = auth.currentUser;
                if (me && setUserProfile) {
                  const fresh = await getUserProfile(me.uid);
                  if (fresh) setUserProfile({ ...(fresh as any) });
                }
              } catch (e) {
                console.warn('Failed to refresh user profile after unassign:', e);
              }

              // Navigate back to doctor dashboard and include a timestamp param
              // to force a remount / re-fetch so the patient list updates immediately.
              router.replace({ pathname: "/doctorDashboard", params: { refreshed: String(Date.now()) } });
            } catch (err: any) {
              console.error("Failed to unassign patient:", err);
              Alert.alert("Error", err?.message || "Failed to remove patient");
            }
          },
        },
      ]
    );
  };

  const onPinchGestureEvent = (e: any) => {
    try {
      const scale = e.nativeEvent.scale ?? 1;
      const focalX = e.nativeEvent.focalX ?? 0;
      const total = modalData.length;
      if (total <= 0) return;
      const W = Dimensions.get('window').width;
      const modalWidth = Math.max(200, W * 0.92 - 24);
      const chartLeft = W * 0.04 + 12; // modal left + inner padding
      const relativeX = focalX - chartLeft;
      const padding = 12;
      const visibleCurrent = Math.max(3, Math.min(total, Math.round(total / Math.max(1, modalZoomRef.current))));
      // index within current visible slice
      const idxInVisible = Math.round(((relativeX - padding) / (modalWidth - padding * 2)) * (visibleCurrent - 1));
      const currentStart = Math.max(0, Math.round((total - visibleCurrent) / 2) - modalOffsetRef.current);
      const focalOverallIndex = Math.max(0, Math.min(total - 1, currentStart + idxInVisible));

      // reduce sensitivity: apply smaller fraction of scale delta
      const scaleDelta = scale - 1;
      const targetZoomRaw = modalZoomRef.current * (1 + scaleDelta * PINCH_SENSITIVITY);
      const targetZoom = Math.max(1, Math.min(10, targetZoomRaw));
      const smoothedZoom = modalZoomRef.current + (targetZoom - modalZoomRef.current) * PINCH_SMOOTH;

      // avoid tiny jitter changes
      if (Math.abs(smoothedZoom - modalZoomRef.current) < 0.02) {
        return;
      }

      const visibleNew = Math.max(3, Math.min(total, Math.round(total / smoothedZoom)));
      const desiredStart = Math.max(0, Math.min(total - visibleNew, focalOverallIndex - Math.floor(visibleNew / 2)));
      const desiredOffsetRaw = ((total - visibleNew) / 2) - desiredStart;
      const smoothedOffset = modalOffsetRef.current + (desiredOffsetRaw - modalOffsetRef.current) * PAN_SMOOTH;

      // update refs + animated values
      modalZoomRef.current = smoothedZoom;
      modalOffsetRef.current = smoothedOffset;
      modalZoomAnim.setValue(smoothedZoom);
      modalOffsetAnim.setValue(smoothedOffset);
      setShowNumbers(true);
    } catch (err) {
      console.error('pinch gesture event error', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!patientId) return;
    setIsSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const idToken = await user.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/doctor/patient/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ patientId, notes: notes ?? null }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(j?.error || 'Failed to save notes');
      }
      Alert.alert('Success', 'Notes saved successfully!');
    } catch (err: any) {
      console.error('Failed to save notes:', err);
      Alert.alert('Error', err?.message || 'Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  // derive first/last non-null history weights for reuse
  const firstHist = history.find(h => h.weight != null && !isNaN(Number(h.weight)))?.weight ?? null;
  const lastHist = [...history].reverse().find(h => h.weight != null && !isNaN(Number(h.weight)))?.weight ?? null;

  const weightLoss =
    // Prefer explicit profile fields; fall back to history first/last non-null weights
    (() => {
      const profileStart = patient?.startingWeight != null && !isNaN(Number(patient.startingWeight)) ? Number(patient.startingWeight) : null;
      const profileCurrent = patient?.currentWeight != null && !isNaN(Number(patient.currentWeight)) ? Number(patient.currentWeight) : null;
      const startVal = profileStart ?? (firstHist != null ? Number(firstHist) : null);
      const currVal = profileCurrent ?? (lastHist != null ? Number(lastHist) : null);
      return (startVal != null && currVal != null) ? (startVal - currVal) : null;
    })();
  const weightLossPercentage =
    (() => {
      if (weightLoss == null) return null;
      const profileStart = patient?.startingWeight != null && !isNaN(Number(patient.startingWeight)) ? Number(patient.startingWeight) : null;
      const firstHist = history.find(h => h.weight != null && !isNaN(Number(h.weight)))?.weight ?? null;
      const denom = profileStart ?? (firstHist != null ? Number(firstHist) : null);
      return denom ? ((weightLoss / (denom || 1)) * 100).toFixed(1) : null;
    })();

  // display current weight: prefer profile currentWeight, else preserved (stable) then today's then last history
  const displayCurrentWeight = (() => {
    const profileCurrent = patient?.currentWeight != null && !isNaN(Number(patient.currentWeight)) && Number(patient.currentWeight) !== 0 ? Number(patient.currentWeight) : null;
    const histCurrent = lastHist != null && !isNaN(Number(lastHist)) ? Number(lastHist) : null;
    // Prefer the profile `currentWeight` when present.
    // Then prefer an explicit today's recorded weight (most recent / user-entered for today).
    // Then fall back to a preserved historical current weight, then last history point.
    return profileCurrent ?? (todaysWeight != null ? todaysWeight : (preservedCurrentWeight != null ? preservedCurrentWeight : (histCurrent ?? null)));
  })();

  // formatted display for weight loss (round to 1 decimal to avoid floating noise)
  const displayWeightLoss = (() => {
    if (weightLoss == null) return null;
    const rounded = Number((Math.round(weightLoss * 10) / 10).toFixed(1));
    if (rounded > 0) return `-${rounded}`; // lost
    if (rounded < 0) return `+${Math.abs(rounded)}`; // gained
    return '0';
  })();

  // compute days post-op
  const daysPostOp = (() => {
    try {
      if (patient?.surgeryDate) {
        const d = new Date(patient.surgeryDate);
        if (!isNaN(d.getTime())) {
          const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
          return diff;
        }
      }
    } catch {}
    return null;
  })();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      // Clear today's weight when switching patients to avoid leaking previous patient's value
      setTodaysWeight(null);
      try {
        if (!patientId) {
          setPatient(null);
          setNotes(null);
          setTodayProtein(null);
          setTodayCalories(null);
          setTodayFluids(null);
          setLoading(false);
          return;
        }

        const user = auth.currentUser;
        if (!user) {
          setPatient(null);
          setNotes(null);
          setTodayProtein(null);
          setTodayCalories(null);
          setTodayFluids(null);
          setLoading(false);
          return;
        }
        const idToken = await user.getIdToken();
        const resp = await fetch(`${API_BASE_URL}/api/doctor/patient?patientId=${encodeURIComponent(patientId)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!resp.ok) {
          let errJson = null;
          try { errJson = await resp.json(); } catch {}
          console.error('Failed to fetch patient', errJson);
          setPatient(null);
          setNotes(null);
          setTodayProtein(null);
          setTodayCalories(null);
          setTodayFluids(null);
          setLoading(false);
          return;
        }
        const j = await resp.json();
        const p = j.patient || {};
        console.log('patient payload from API:', p);
        if (mounted) {
          const parseNum = (v: any) => (v === '' || v === null || v === undefined) ? null : (!isNaN(Number(v)) ? Number(v) : null);
          setPatient({
            id: p.uid,
            name: p.name ?? null,
            sex: p.sex ?? null,
            dateOfBirth: p.dateOfBirth ?? null,
            surgeryType: p.surgeryType ?? null,
            surgeryDate: p.surgeryDate ?? null,
            currentWeight: parseNum(p.currentWeight),
            startingWeight: parseNum(p.startingWeight),
            goalWeight: parseNum(p.goalWeight),
            proteinGoal: p.proteinGoal ?? null,
            fluidGoal: p.fluidGoal ?? null,
            calorieGoal: p.calorieGoal ?? null,
            notes: p.notes ?? null,
          });
          setNotes(p.notes ?? null);
          const today = j.today || {};
          setTodayProtein(today.protein ?? null);
          setTodayCalories(today.calories ?? null);
          setTodayFluids(today.fluids ?? null);
          // If we don't yet have a preserved todaysWeight, initialize it from profile currentWeight
          try {
            const profileCurrent = parseNum(p.currentWeight);
            setTodaysWeight((prev) => (prev == null && profileCurrent != null ? profileCurrent : prev));
          } catch {}
        }
      } catch (err) {
        console.error("Failed to load patient or logs:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [patientId]);

  const buildRangeFor = useCallback((tf: typeof timeframe) => {
    // Use UTC day boundaries so server-side aggregation (which uses
    // toISOString().slice(0,10) / UTC keys) receives matching ranges.
    const now = new Date();
    const utc = (d: Date) => ({
      y: d.getUTCFullYear(),
      m: d.getUTCMonth(),
      day: d.getUTCDate(),
    });
    const startOfUtcDay = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
    const endOfUtcDay = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day, 23, 59, 59, 999));

    let start: Date, end: Date;
    if (tf === 'today') {
      const u = utc(now);
      start = startOfUtcDay(u.y, u.m, u.day);
      end = endOfUtcDay(u.y, u.m, u.day);
    } else if (tf === 'week') {
      // last 7 days including today
      const then = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      then.setUTCDate(then.getUTCDate() - 6);
      const sU = utc(then);
      start = startOfUtcDay(sU.y, sU.m, sU.day);
      const u = utc(now);
      end = endOfUtcDay(u.y, u.m, u.day);
    } else if (tf === 'month') {
      const then = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      then.setUTCMonth(then.getUTCMonth() - 1);
      const sU = utc(then);
      start = startOfUtcDay(sU.y, sU.m, sU.day);
      const u = utc(now);
      end = endOfUtcDay(u.y, u.m, u.day);
    } else if (tf === 'year') {
      const then = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      then.setUTCFullYear(then.getUTCFullYear() - 1);
      const sU = utc(then);
      start = startOfUtcDay(sU.y, sU.m, sU.day);
      const u = utc(now);
      end = endOfUtcDay(u.y, u.m, u.day);
    } else {
      const s = startDate ? new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const e = endDate ? new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const sU = utc(s); const eU = utc(e);
      start = startOfUtcDay(sU.y, sU.m, sU.day);
      end = endOfUtcDay(eU.y, eU.m, eU.day);
    }
    return { start, end };
  }, [startDate, endDate]);

  const fetchHistory = useCallback(async (tf?: typeof timeframe) => {
    if (!patientId) return;
    try {
      setLoadingHistory(true);
      const { start, end } = buildRangeFor(tf ?? timeframe);
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const url = `${API_BASE_URL}/api/doctor/patient/history?patientId=${encodeURIComponent(patientId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
      const resp = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } });
      if (!resp.ok) return;
      const j = await resp.json();
      const fetched = j.history || [];
      console.log('fetched history', { patientId, count: fetched.length, sampleWeight: (fetched && fetched[0] ? fetched[0].weight : null) });
      setHistory(fetched);
      // If the fetched slice includes today's entry, capture it and keep it until an explicit new today's entry is observed.
      try {
        // Use UTC-based YYYY-MM-DD to match server-side keys (which use toISOString().slice(0,10))
        const todayIso = (new Date()).toISOString().slice(0,10);
        const todayEntry = fetched.find((h: any) => h.date === todayIso && h.weight != null);
        if (todayEntry && !isNaN(Number((todayEntry as any).weight))) {
          const val = Number((todayEntry as any).weight);
          console.log('setTodaysWeight from fetched today entry', val);
          setTodaysWeight(val);
        }
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [patientId, timeframe, buildRangeFor]);

  const fetchFullHistoryForPreserve = useCallback(async () => {
    if (!patientId) return;
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const start = new Date('2000-01-01T00:00:00Z');
      const end = new Date();
      const url = `${API_BASE_URL}/api/doctor/patient/history?patientId=${encodeURIComponent(patientId)}&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;
      const resp = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } });
      if (!resp.ok) return;
      const j = await resp.json().catch(() => ({}));
      const fetched = j.history || [];
      const lastAny = [...fetched].reverse().find((h: any) => h.weight != null && !isNaN(Number(h.weight)));
      if (lastAny) {
        const val = Number(lastAny.weight);
        setPreservedCurrentWeight((prev) => (prev == null ? val : prev));
        console.log('initialized preservedCurrentWeight from full history', val);
      }
    } catch (err) {
      console.error('failed to fetch full history for preserve', err);
    }
  }, [patientId]);

  useEffect(() => {
    // fetch when timeframe or patient changes
    fetchHistory();
    // initialize preserved current once when patient changes
    setPreservedCurrentWeight(null);
    fetchFullHistoryForPreserve();
  }, [patientId, timeframe]);

  function formatDayLabel(iso: string) {
    try {
      const d = new Date(iso + 'T00:00:00Z');
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  function MiniLineChart({ values, goal, width = 300, height = 100, showAxes = false, labels, highlightIndex, yAxisLabel, paddingTop, showAllNumbers }: { values: (number | null)[]; goal?: number | null; width?: number; height?: number; showAxes?: boolean; labels?: string[]; highlightIndex?: number | null; yAxisLabel?: string; paddingTop?: number; showAllNumbers?: boolean }) {
    const hPad = 12;
    const vPad = typeof paddingTop === 'number' ? paddingTop : 12;
    // compute min/max from available (non-null) values so missing entries don't pull the scale to zero
    const available = values.filter((v) => v != null) as number[];
    const fallbackMax = goal != null ? goal : 1;
    const max = available.length ? Math.max(...available, fallbackMax) : Math.max(fallbackMax, 1);
    const min = available.length ? Math.min(...available, 0) : 0;
    const range = Math.max(max - min, 1);
    // build points, preserving nulls so we can break the path when values are missing
    const denom = values.length > 1 ? values.length - 1 : 1;
    const nonNullCount = values.filter(v => v != null).length;
    const points = values.map((v, i) => {
      // If there's only one non-null value in the series, center that point horizontally
      const x = (nonNullCount === 1 && v != null) ? (width / 2) : (hPad + (i / denom) * (width - hPad * 2));
      const y = v == null ? null : height - vPad - (((v as number) - min) / range) * (height - vPad * 2);
      return { x, y, v: v == null ? null : (v as number) };
    });
    // create a single continuous path connecting all non-null points
    const nonNullPoints = points.filter((p) => p.v != null) as { x: number; y: number | null; v: number }[];
    const d = nonNullPoints.length ? 'M' + nonNullPoints.map((p) => `${p.x},${p.y}`).join(' L ') : '';
    // goal line y coordinate
    const goalY = typeof goal === 'number' ? height - vPad - ((goal - min) / range) * (height - vPad * 2) : null;
    return (
      <Svg width={width} height={height}>
        {/* grid + axes */}
        {showAxes && (() => {
          const lines = [] as any[];
          // horizontal grid
          for (let i=0;i<5;i++) {
            const y = vPad + (i / 4) * (height - vPad*2);
            lines.push(<Path key={`g${i}`} d={`M ${hPad},${y} L ${width-hPad},${y}`} stroke={i===4? '#9CA3AF' : '#E6EAE6'} strokeWidth={i===4?1.2:0.8} />);
          }
          // vertical grid (up to 6)
          const vcount = Math.min(6, Math.max(2, points.length));
          for (let i=0;i<vcount;i++) {
            const x = hPad + (i/(vcount-1))*(width-hPad*2);
            lines.push(<Path key={`v${i}`} d={`M ${x},${vPad} L ${x},${height-vPad}`} stroke={'#F2F6F2'} strokeWidth={0.8} />);
          }
          return lines;
        })()}
        {goalY != null && (
          <>
            <Path d={`M ${hPad},${goalY} L ${width-hPad},${goalY}`} stroke="#9CA3AF" strokeDasharray="4 4" strokeWidth={1} />
            <SvgText x={width - hPad - 6} y={goalY - 8} fontSize={12} fill="#4B5563" textAnchor="end">{`Goal: ${Math.round(goal as number)}`}</SvgText>
          </>
        )}
        <Path d={d} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          p.v == null ? null : (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y as number} r={(highlightIndex === i) ? 5 : 3} fill={(goal != null && (p.v as number) >= (goal ?? 0)) ? '#16A34A' : '#3b82f6'} />
            {((showAllNumbers) || (showNumbers && highlightIndex === i)) ? (
              <SvgText x={p.x} y={(p.y as number) - 12} fontSize={12} fill="#004734" textAnchor="middle">{String(p.v)}</SvgText>
            ) : null}
          </React.Fragment>)
        ))}
        {/* Y axis labels */}
        {showAxes && (() => {
          const labels = [] as any[];
          for (let i=0;i<5;i++) {
            const val = (max - (i/4)*(max-min));
            const y = vPad + (i / 4) * (height - vPad*2);
            labels.push(<SvgText key={`yl${i}`} x={6} y={y+4} fontSize={10} fill="#3F5E52">{Math.round(val)}</SvgText>);
          }
          // optional Y axis title
          if (yAxisLabel) {
            labels.push(<SvgText key={`ytitle`} x={hPad} y={vPad - 8} fontSize={12} fill="#3F5E52">{yAxisLabel}</SvgText>);
          }
          return labels;
        })()}
        {/* X axis labels (first/mid/last) */}
        {showAxes && labels && labels.length>0 && (() => {
          const L = labels.length;
          const first = labels[0] ?? '';
          const mid = labels[Math.floor(L/2)] ?? '';
          const last = labels[L-1] ?? '';
          return (<>
            <SvgText x={hPad} y={height-2} fontSize={10} fill="#7A9C8A">{first}</SvgText>
            <SvgText x={width/2} y={height-2} fontSize={10} fill="#7A9C8A" textAnchor="middle">{mid}</SvgText>
            <SvgText x={width-hPad} y={height-2} fontSize={10} fill="#7A9C8A" textAnchor="end">{last}</SvgText>
          </>);
        })()}
      </Svg>
    );
  }

  function getDisplayedValues(arr: (number | null)[]) {
    if (!arr || !arr.length) return arr;
    if (zoomWindow && arr.length > zoomWindow) return arr.slice(-zoomWindow);
    return arr;
  }

  function computeSlicedForModal(arr: (number | null)[], zoom: number, offset: number) {
    const total = arr.length;
    if (total === 0) return arr;
    const z = Math.max(1, zoom);
    const visible = Math.max(3, Math.min(total, Math.round(total / z)));
    // center start index, then apply fractional offset (allow smooth panning)
    let start = Math.round((total - visible) / 2 - offset);
    if (start < 0) start = 0;
    if (start + visible > total) start = Math.max(0, total - visible);
    return arr.slice(start, start + visible);
  }

  function openChartModal(data: (number | null)[], title: string, goal: number | null) {
    setModalData(data || []);
    setModalTotal(data ? data.filter(v => v != null).length : 0);
    setModalTitle(title);
    setModalGoal(goal ?? null);
    setModalZoom(1);
    setModalOffset(0);
    modalZoomAnim.setValue(1);
    modalOffsetAnim.setValue(0);
    modalZoomRef.current = 1;
    modalOffsetRef.current = 0;
    setShowNumbers(false);
    setModalShowAllNumbers(true);
    setModalVisible(true);
  }

  function closeChartModal() {
    setModalVisible(false);
    setModalZoom(1);
    setModalOffset(0);
    modalZoomRef.current = 1;
    modalOffsetRef.current = 0;
    setShowNumbers(false);
    setModalShowAllNumbers(false);
  }

  const handleModalPinchEnd = (e: any) => {
    try {
      const s = e.nativeEvent.scale ?? 1;
      const total = modalData.length;
      if (total > 0) {
        // finalize zoom more smoothly and using the ref (which was smoothed during gesture)
        if (s > 1.03) {
          const intended = modalZoomRef.current * (1 + (s - 1) * 0.4);
          const target = Math.max(1, Math.min(10, intended));
          Animated.timing(modalZoomAnim, { toValue: target, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
          modalZoomRef.current = target;
          setShowNumbers(true);
        } else if (s < 0.97) {
          Animated.timing(modalZoomAnim, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
            setShowNumbers(false);
            Animated.timing(modalOffsetAnim, { toValue: 0, duration: 260, useNativeDriver: false }).start();
            modalZoomRef.current = 1;
            modalOffsetRef.current = 0;
          });
        }
      }
    } catch (err) {
      console.error('pinch modal error', err);
    }
  };

  const handleModalPanEnd = (e: any) => {
    try {
      const tx = e.nativeEvent.translationX ?? 0;
      const total = modalData.length;
      if (total <= 0) return;
      const width = Math.max(1, Dimensions.get('window').width - 48); // padding
      const visible = Math.max(3, Math.round(total / Math.max(1, modalZoom)));
      const per = width / Math.max(1, visible);
      const delta = (tx / per); // fractional index delta
      let newOffset = Math.max(0, Math.min(total - visible, panStartOffsetRef.current - delta));
      // add a small inertia based on velocity if available
      const vel = e.nativeEvent.velocityX ?? 0; // px / sec
      // if strong velocity, use decay for natural inertia in index-space
      if (Math.abs(vel) > 80) {
        // convert px/sec velocity -> indices/sec
        const velocityIdx = -vel / per;
        // stop any previous decay
        if (decayAnimRef.current && decayAnimRef.current.stop) decayAnimRef.current.stop();
        decayAnimRef.current = Animated.decay(modalOffsetAnim, { velocity: velocityIdx, deceleration: 0.995, useNativeDriver: false });
        decayAnimRef.current.start(() => {
          // ensure offset is clamped inside bounds when decay finishes
          const final = modalOffsetRef.current || 0;
          const clamped = Math.max(0, Math.min(total - visible, final));
          Animated.spring(modalOffsetAnim, { toValue: clamped, useNativeDriver: false, tension: 30, friction: 18 }).start();
          decayAnimRef.current = null;
        });
      } else {
        Animated.spring(modalOffsetAnim, { toValue: newOffset, useNativeDriver: false, tension: 30, friction: 20 }).start();
      }
      // reset vertical translate (damped)
      Animated.spring(modalTranslateYAnim, { toValue: 0, useNativeDriver: false, tension: 30, friction: 18 }).start();
      panActiveRef.current = false;
    } catch (err) {
      console.error('pan modal error', err);
    }
  };

  const onPanGestureEvent = (e: any) => {
    try {
      const tx = e.nativeEvent.translationX ?? 0;
      const ty = e.nativeEvent.translationY ?? 0;
      const total = modalData.length;
      if (total <= 0) return;
      const width = Math.max(1, Dimensions.get('window').width - 48);
      const visible = Math.max(3, Math.round(total / Math.max(1, modalZoom)));
      const per = width / Math.max(1, visible);
      if (!panActiveRef.current) {
        panActiveRef.current = true;
        panStartOffsetRef.current = modalOffsetRef.current;
      }
      const deltaIndex = (tx / per);
      const rawNewOff = Math.max(0, Math.min(total - visible, panStartOffsetRef.current - deltaIndex));
      const smoothOff = modalOffsetRef.current + (rawNewOff - modalOffsetRef.current) * PAN_SMOOTH;
      modalOffsetRef.current = smoothOff;
      modalOffsetAnim.setValue(smoothOff);
      modalTranslateYAnim.setValue(ty * 0.6);
    } catch (err) {
      console.error('pan gesture event error', err);
    }
  };

  useEffect(() => {
    const zl = modalZoomAnim.addListener(({ value }) => {
      setModalZoom(value);
      modalZoomRef.current = value;
    });
    const ol = modalOffsetAnim.addListener(({ value }) => {
      setModalOffset(value);
      modalOffsetRef.current = value;
    });
    return () => {
      modalZoomAnim.removeListener(zl);
      modalOffsetAnim.removeListener(ol);
    };
  }, [modalZoomAnim, modalOffsetAnim]);

  function handleModalTouch(nativeEvent: any) {
    try {
      const displayed = computeSlicedForModal(modalData, modalZoom, modalOffset);
      const total = displayed.length;
      if (total === 0) return;
      const width = Math.max(200, Dimensions.get('window').width * 0.92 - 24);
      const padding = 12;
      const x = nativeEvent.locationX ?? nativeEvent.pageX ?? 0;
      const idx = Math.round(((x - padding) / (width - padding * 2)) * (total - 1));
      const i = Math.max(0, Math.min(total - 1, idx));
      setModalHighlightIndex(i);
      setShowNumbers(true);
      // detect double tap -> zoom to point
      const now = Date.now();
      const last = lastTapRef.current || 0;
      if (now - last < 300) {
        // double tap: zoom to this point
        const overallTotal = modalData.length;
        // compute current slice start
        const z = Math.max(1, modalZoom);
        const visibleNew = Math.max(3, Math.min(overallTotal, Math.round(overallTotal / Math.max(1, modalZoom * 1.5))));
        // compute current start index
        const currentVisible = Math.max(3, Math.min(overallTotal, Math.round(overallTotal / Math.max(1, modalZoom))));
        const currentStart = Math.max(0, Math.round((overallTotal - currentVisible) / 2) - modalOffset);
        const overallIndex = currentStart + i;
        const desiredStart = Math.max(0, Math.min(overallTotal - visibleNew, overallIndex - Math.floor(visibleNew / 2)));
        const desiredOffset = Math.round((overallTotal - visibleNew) / 2) - desiredStart;
        Animated.timing(modalZoomAnim, { toValue: Math.min(10, modalZoom * 1.5), duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        Animated.timing(modalOffsetAnim, { toValue: desiredOffset, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      }
      lastTapRef.current = now;
    } catch (err) {
      console.error('modal touch error', err);
    }
  }

  const handlePinchEnd = (e: any, totalCount: number) => {
    try {
      const s = e.nativeEvent.scale ?? 1;
      if (s > 1.1 && totalCount > 0) {
        const newWindow = Math.max(3, Math.floor(totalCount / s));
        setZoomWindow(newWindow);
        setShowNumbers(true);
      } else {
        setZoomWindow(null);
        setShowNumbers(false);
      }
    } catch (err) {
      console.error('pinch error', err);
    }
  };

  return (
    <GestureHandlerRootView style={{flex:1}}>
      <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        ref={(r) => { /* keep ref for gesture handlers */ }}
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#004734" />
          </Pressable>
          <Text style={styles.title}>{patient?.name ?? ""}</Text>
          {isDoctor ? (
            <Pressable onPress={handleUnassign} style={styles.removeButtonHeader}>
              <Text style={styles.removeTextHeader}>Remove</Text>
            </Pressable>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#009235" />
          </View>
        ) : (
          <>
            {/* Patient Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Patient Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Age</Text>
                <Text style={styles.detailValue}>{patient?.dateOfBirth ? (() => {
                    const dob = new Date(patient.dateOfBirth as string);
                    if (!isNaN(dob.getTime())) {
                      const today = new Date();
                      let age = today.getFullYear() - dob.getFullYear();
                      const m = today.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                      return `${age} years`;
                    }
                    return "n/a";
                  })() : "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sex</Text>
                <Text style={styles.detailValue}>{patient?.sex ?? "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Surgery</Text>
                <Text style={styles.detailValue}>{patient?.surgeryType ?? "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Surgery Date</Text>
                <Text style={styles.detailValue}>{patient?.surgeryDate ? formatSurgeryMonthYear(patient.surgeryDate) : "n/a"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{patient?.surgeryDate ? (calculatePostOpTime(patient.surgeryDate) ?? "n/a") : "n/a"}</Text>
              </View>
            </View>
            {/* Chart Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeChartModal}>
              <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center'}}>
                <View style={{width:'96%', backgroundColor:'#FFF8E7', borderRadius:16, padding:16, maxHeight:'90%'}}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                    <Text style={{fontSize:16, fontWeight:'700', color:'#004734'}}>{modalTitle}</Text>
                    <Pressable onPress={closeChartModal} style={{padding:8}}><Text style={{color:'#004734', fontWeight:'700'}}>Close</Text></Pressable>
                  </View>
                  <PanGestureHandler onGestureEvent={(e) => onPanGestureEvent(e)} onHandlerStateChange={(e) => { if (e.nativeEvent.state === GestureState.END) handleModalPanEnd(e); }}>
                    <View>
                      <PinchGestureHandler onGestureEvent={(e) => onPinchGestureEvent(e)} onHandlerStateChange={(e) => { if (e.nativeEvent.state === GestureState.END) handleModalPinchEnd(e); }}>
                        <View style={{alignItems:'center'}} onStartShouldSetResponder={() => true} onResponderGrant={(ev) => handleModalTouch(ev.nativeEvent)}>
                          {(() => {
                            const modalWidth = Math.max(300, Dimensions.get('window').width * 0.96 - 24);
                            const displayed = computeSlicedForModal(modalData, modalZoom, modalOffset);
                            const labels = Array.from({length: displayed.length}, (_,i) => (i+1).toString());
                            return (
                                <Animated.View
                                style={{transform:[{translateY: modalTranslateYAnim}]}}
                                  onStartShouldSetResponder={() => true}
                                  onResponderGrant={() => { panStartOffsetRef.current = modalOffsetRef.current; panActiveRef.current = true; }}
                                  onResponderMove={(ev) => onPanGestureEvent({ nativeEvent: ev.nativeEvent })}
                                  onResponderRelease={(ev) => handleModalPanEnd({ nativeEvent: ev.nativeEvent })}
                                >
                                <MiniLineChart width={modalWidth} height={320} values={displayed} goal={modalGoal} showAxes labels={labels} highlightIndex={modalHighlightIndex} yAxisLabel={modalTitle ?? undefined} paddingTop={28} showAllNumbers={modalShowAllNumbers} />
                              </Animated.View>
                            );
                          })()}
                        </View>
                      </PinchGestureHandler>
                    </View>
                  </PanGestureHandler>
                </View>
              </View>
            </Modal>
            {showStartPicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
                  <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'90%', backgroundColor:'#fff', borderRadius:12, padding:12}}>
                      <DateTimePicker
                        value={startDate || new Date()}
                        mode="date"
                        display={'inline'}
                        onChange={(e, d) => {
                          if (d) {
                            setStartDate(d);
                            setTimeframe('custom');
                            setTimeout(() => fetchHistory('custom'), 50);
                          }
                        }}
                      />
                      <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop:8}}>
                        <Pressable onPress={() => setShowStartPicker(false)} style={{padding:8}}><Text style={{color:'#004734', fontWeight:'700'}}>Done</Text></Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display={'calendar'}
                  onChange={(e, d) => {
                    setShowStartPicker(false);
                    if (d) {
                      setStartDate(d);
                      setTimeframe('custom');
                      setTimeout(() => fetchHistory('custom'), 50);
                    }
                  }}
                />
              )
            )}
            {showEndPicker && (
              Platform.OS === 'ios' ? (
                <Modal transparent animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
                  <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center'}}>
                    <View style={{width:'90%', backgroundColor:'#fff', borderRadius:12, padding:12}}>
                      <DateTimePicker
                        value={endDate || new Date()}
                        mode="date"
                        display={'inline'}
                        onChange={(e, d) => {
                          if (d) {
                            setEndDate(d);
                            setTimeframe('custom');
                            setTimeout(() => fetchHistory('custom'), 50);
                          }
                        }}
                      />
                      <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop:8}}>
                        <Pressable onPress={() => setShowEndPicker(false)} style={{padding:8}}><Text style={{color:'#004734', fontWeight:'700'}}>Done</Text></Pressable>
                      </View>
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display={'calendar'}
                  onChange={(e, d) => {
                    setShowEndPicker(false);
                    if (d) {
                      setEndDate(d);
                      setTimeframe('custom');
                      setTimeout(() => fetchHistory('custom'), 50);
                    }
                  }}
                />
              )
            )}

            {/* Manual weight input modal */}

            

            {/* Weight Progress Card */}
            <View style={styles.card}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                  <Text style={styles.cardTitle}>Weight Progress</Text>
                  <View style={{flexDirection:'row', gap:8}}>
                  </View>
                </View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Activity size={20} color="#FF7A2F" />
                  <Text style={styles.statValue}>{displayCurrentWeight != null ? String(displayCurrentWeight) : "n/a"}</Text>
                  <Text style={styles.statLabel}>Current</Text>
                </View>
                <View style={styles.statCard}>
                  <Target size={20} color="#009235" />
                  <Text style={styles.statValue}>{patient?.goalWeight ?? "n/a"}</Text>
                  <Text style={styles.statLabel}>Goal</Text>
                </View>
                <View style={styles.statCard}>
                  <TrendingUp size={20} color="#3b82f6" />
                  <Text style={styles.statValue}>{displayWeightLoss != null ? displayWeightLoss : "n/a"}</Text>
                  <Text style={styles.statLabel}>Lost ({weightLossPercentage ?? "n/a"}%)</Text>
                </View>
              </View>
              {/* Chart area */}
              {metric === 'weight' ? (
                <View style={{marginTop:12}}>
                  <View style={{flexDirection:'row', gap:4, marginBottom:10}}>
                    <Pressable onPress={() => setTimeframe('today')} style={[styles.pill, timeframe==='today'&&styles.pillActive]}><Text style={styles.pillText}>Today</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('week')} style={[styles.pill, timeframe==='week'&&styles.pillActive]}><Text style={styles.pillText}>Week</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('month')} style={[styles.pill, timeframe==='month'&&styles.pillActive]}><Text style={styles.pillText}>Month</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('year')} style={[styles.pill, timeframe==='year'&&styles.pillActive]}><Text style={styles.pillText}>Year</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('custom')} style={[styles.pill, timeframe==='custom'&&styles.pillActive]}><Text style={styles.pillText}>Custom</Text></Pressable>
                    {auth.currentUser && auth.currentUser.uid === patientId ? null : null}
                  </View>
                  {timeframe === 'custom' && (
                    <View style={{width:'100%', marginTop:10, alignItems:'center'}}>
                      <View style={{width:'60%', flexDirection:'row', justifyContent:'space-between'}}>
                        <Pressable onPress={() => { console.log('Start button pressed (weight)'); setShowStartPicker(true); }} style={styles.dateButton}><Text style={{color:'#004734'}}>{startDate ? startDate.toLocaleDateString() : 'Start'}</Text></Pressable>
                        <Pressable onPress={() => { console.log('End button pressed (weight)'); setShowEndPicker(true); }} style={styles.dateButton}><Text style={{color:'#004734'}}>{endDate ? endDate.toLocaleDateString() : 'End'}</Text></Pressable>
                      </View>
                    </View>
                  )}
                
                  <View style={{marginTop:12, alignItems:'center'}}>
                    {loadingHistory ? (
                      <ActivityIndicator />
                    ) : (
                      <>
                        <View style={{alignItems:'center', marginBottom:6}}>
                          <Text style={{fontSize:14, fontWeight:'700', color:'#004734'}}>{`Weight — ${timeframe === 'custom' ? (startDate ? startDate.toLocaleDateString() : '') + ' to ' + (endDate ? endDate.toLocaleDateString() : '') : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`}</Text>
                          <Text style={{fontSize:12, color:'#3F5E52'}}>{`Dashed line = goal weight`}</Text>
                        </View>
                        {(() => {
                          const weightVals = history.map((h) => {
                            const w = (h as any).weight;
                            return (w == null || w === 0) ? null : w;
                          });
                          const weightData = weightVals.some(v => v != null) ? weightVals : [patient?.startingWeight ?? null, patient?.currentWeight ?? null];
                          // calculate visible slice using zoomWindow and inlineOffset
                          const totalW = weightData.length;
                          let displayedWeight = weightData;
                          if (zoomWindow && totalW > zoomWindow) {
                            const start = Math.max(0, Math.min(totalW - zoomWindow, inlineOffsetRef.current || inlineOffset));
                            displayedWeight = weightData.slice(start, start + zoomWindow);
                          } else {
                            displayedWeight = getDisplayedValues(weightData);
                          }
                          let weightLabels = history.map(h => formatDayLabel(h.date));
                          if (zoomWindow && weightLabels.length > zoomWindow) weightLabels = weightLabels.slice((inlineOffsetRef.current || inlineOffset), (inlineOffsetRef.current || inlineOffset) + zoomWindow);
                          const chartWidth = Math.max(300, Dimensions.get('window').width - 48);
                          return (
                            <PanGestureHandler onGestureEvent={(e) => onInlinePanGestureEvent(e, totalW, chartWidth)} onHandlerStateChange={onInlinePanHandlerStateChange} activeOffsetX={[-10,10]} failOffsetY={[-10,10]}>
                              <View>
                                <Pressable onPress={() => openChartModal(weightData, 'Weight', patient?.goalWeight ?? null)}>
                                  <MiniLineChart values={displayedWeight} goal={patient?.goalWeight ?? null} showAxes labels={weightLabels} yAxisLabel={`Weight`} paddingTop={18} />
                                </Pressable>
                              </View>
                            </PanGestureHandler>
                          );
                        })()}
                          <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                            <View style={{width:18, height:6, borderStyle:'dashed', borderWidth:1, borderColor:'#9CA3AF'}} />
                            <Text style={{color:'#3F5E52'}}>Goal</Text>
                          </View>
                          {/* "Met" legend intentionally removed for weight progress (not meaningful over short timeframes) */}
                        <View style={{marginTop:8, alignItems:'center'}}>
                          {(() => {
                            const vals = history.map(h => {
                              const w = h.weight;
                              return (w == null || w === 0) ? null : w;
                            });
                            // compute number of days in the selected range
                            let days = 1;
                            if (timeframe === 'today') {
                              days = 1;
                            } else if (timeframe === 'week') {
                              days = 7;
                            } else if (timeframe === 'month') {
                              days = 30;
                            } else if (timeframe === 'year') {
                              days = 365;
                            } else {
                              // custom: compute inclusive days between start/end
                              const { start: _wStart, end: _wEnd } = buildRangeFor(timeframe);
                              const msPerDay = 24 * 60 * 60 * 1000;
                              const sStart = new Date(_wStart);
                              const sEnd = new Date(_wEnd);
                              sStart.setHours(0,0,0,0);
                              sEnd.setHours(0,0,0,0);
                              days = Math.max(1, Math.floor((sEnd.getTime() - sStart.getTime()) / msPerDay) + 1);
                            }
                            const valid = vals.filter(v => v != null).map(v => Number(v));
                            const avg = valid.length ? Math.round((valid.reduce((a,b) => a+b,0)/valid.length)*10)/10 : 0;
                            const met = vals.filter(v => v != null && patient && patient.goalWeight != null && v <= patient.goalWeight).length;
                            const pct = days>0 ? Math.round((met/days)*100) : 0;
                            const goalVal = patient?.goalWeight ?? null;
                            return (
                              <View style={{alignItems:'center'}}>
                                <Text style={{color:'#3F5E52', fontWeight:'600'}}>{`Avg: ${avg} — Goal: ${goalVal ?? 'n/a'}`}</Text>
                                {metric !== 'weight' ? (
                                  <Text style={{color:'#3F5E52', fontWeight:'600'}}>{`Met goal ${met} of ${days} days (${pct}%)`}</Text>
                                ) : null}
                              </View>
                            );
                          })()}
                        </View>
                        {/* x-axis labels removed per design */}
                      </>
                    )}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Today's Nutrition Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nutrition Progress</Text>
              <Text style={{fontSize:16, color:'#004734', marginTop:6, alignSelf:'center', textAlign:'center'}}>Today</Text>
              <View style={styles.macrosGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={styles.macroValue}>{todayProtein != null ? `${todayProtein}g` : "n/a"}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient?.proteinGoal ?? "n/a"}g</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Fluids</Text>
                  <Text style={styles.macroValue}>{todayFluids != null ? `${todayFluids}oz` : "n/a"}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient?.fluidGoal ?? "n/a"}oz</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroLabel}>Calories</Text>
                  <Text style={styles.macroValue}>{todayCalories != null ? `${todayCalories}` : "n/a"}</Text>
                  <Text style={styles.macroGoal}>Goal: {patient?.calorieGoal ?? "n/a"}</Text>
                </View>
              </View>
              {/* Nutrition analysis and history (moved here) */}
              <View style={{marginTop:12}}>
                  <View style={{flexDirection:'row', gap:4, marginBottom:10}}>
                    <Pressable onPress={() => setTimeframe('today')} style={[styles.pill, timeframe==='today'&&styles.pillActive]}><Text style={styles.pillText}>Today</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('week')} style={[styles.pill, timeframe==='week'&&styles.pillActive]}><Text style={styles.pillText}>Week</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('month')} style={[styles.pill, timeframe==='month'&&styles.pillActive]}><Text style={styles.pillText}>Month</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('year')} style={[styles.pill, timeframe==='year'&&styles.pillActive]}><Text style={styles.pillText}>Year</Text></Pressable>
                    <Pressable onPress={() => setTimeframe('custom')} style={[styles.pill, timeframe==='custom'&&styles.pillActive]}><Text style={styles.pillText}>Custom</Text></Pressable>
                    {auth.currentUser && auth.currentUser.uid === patientId ? null : null}
                  </View>
                  {timeframe === 'custom' && (
                    <View style={{width:'100%', marginTop:10, alignItems:'center'}}>
                      <View style={{width:'60%', flexDirection:'row', justifyContent:'space-between'}}>
                        <Pressable onPress={() => { console.log('Start button pressed (nutrition)'); setShowStartPicker(true); }} style={styles.dateButton}><Text style={{color:'#004734'}}>{startDate ? startDate.toLocaleDateString() : 'Start'}</Text></Pressable>
                        <Pressable onPress={() => { console.log('End button pressed (nutrition)'); setShowEndPicker(true); }} style={styles.dateButton}><Text style={{color:'#004734'}}>{endDate ? endDate.toLocaleDateString() : 'End'}</Text></Pressable>
                      </View>
                    </View>
                  )}

                <View style={{marginTop:12, alignItems:'center'}}>
                  {loadingHistory ? (
                    <ActivityIndicator />
                  ) : (
                      <>
                        <View style={{alignItems:'center', marginBottom:6}}>
                          <Text style={{fontSize:14, fontWeight:'700', color:'#004734'}}>{`${nutrient === 'calories' ? 'Calories' : nutrient === 'protein' ? 'Protein (g)' : 'Fluids (oz)'} — ${timeframe === 'custom' ? (startDate ? startDate.toLocaleDateString() : '') + ' to ' + (endDate ? endDate.toLocaleDateString() : '') : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`}</Text>
                          <Text style={{fontSize:12, color:'#3F5E52'}}>{`Dashed line = goal • Green dot = day met goal`}</Text>
                        </View>
                        {(() => {
                          const nutrientVals = history.map(h => (h[nutrient] ?? null));
                          const totalN = nutrientVals.length;
                          let displayedNutrient = nutrientVals;
                          if (zoomWindow && totalN > zoomWindow) {
                            const start = Math.max(0, Math.min(totalN - zoomWindow, inlineOffsetRef.current || inlineOffset));
                            displayedNutrient = nutrientVals.slice(start, start + zoomWindow);
                          } else {
                            displayedNutrient = getDisplayedValues(nutrientVals);
                          }
                          let nutrientLabels = history.map(h => formatDayLabel(h.date));
                          if (zoomWindow && nutrientLabels.length > zoomWindow) nutrientLabels = nutrientLabels.slice((inlineOffsetRef.current || inlineOffset), (inlineOffsetRef.current || inlineOffset) + zoomWindow);
                          const chartWidth = Math.max(300, Dimensions.get('window').width - 48);
                          return (
                            <PanGestureHandler onGestureEvent={(e) => onInlinePanGestureEvent(e, totalN, chartWidth)} onHandlerStateChange={onInlinePanHandlerStateChange} activeOffsetX={[-10,10]} failOffsetY={[-10,10]}>
                              <View>
                                <Pressable onPress={() => openChartModal(history.map(h => (h[nutrient] ?? null)), nutrient === 'calories' ? 'Calories' : nutrient === 'protein' ? 'Protein' : 'Fluids', nutrient === 'calories' ? patient?.calorieGoal ?? null : nutrient === 'protein' ? patient?.proteinGoal ?? null : patient?.fluidGoal ?? null)}>
                                  <MiniLineChart values={displayedNutrient} goal={
                                    nutrient === 'calories' ? patient?.calorieGoal ?? null : nutrient === 'protein' ? patient?.proteinGoal ?? null : patient?.fluidGoal ?? null
                                  } showAxes labels={nutrientLabels} yAxisLabel={nutrient === 'calories' ? 'Calories' : nutrient === 'protein' ? 'Protein (g)' : 'Fluids (oz)'} paddingTop={18} />
                                </Pressable>
                              </View>
                            </PanGestureHandler>
                          );
                        })()}
                        <View style={{flexDirection:'row', justifyContent:'center', gap:10, marginTop:8}}>
                          <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                            <View style={{width:18, height:6, backgroundColor:'#3b82f6'}} />
                            <Text style={{color:'#3F5E52'}}>Actual</Text>
                          </View>
                          <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                            <View style={{width:18, height:6, borderStyle:'dashed', borderWidth:1, borderColor:'#9CA3AF'}} />
                            <Text style={{color:'#3F5E52'}}>Goal</Text>
                          </View>
                          <View style={{flexDirection:'row', alignItems:'center', gap:6}}>
                            <View style={{width:10, height:10, borderRadius:5, backgroundColor:'#16A34A'}} />
                            <Text style={{color:'#3F5E52'}}>Met</Text>
                          </View>
                        </View>
                        <View style={{flexDirection:'row', gap:8, marginTop:8, alignItems:'center'}}>
                          <Pressable onPress={() => setNutrient('calories')} style={[styles.pill, nutrient==='calories' && styles.pillActive]}><Text style={styles.pillText}>Calories</Text></Pressable>
                          <Pressable onPress={() => setNutrient('protein')} style={[styles.pill, nutrient==='protein' && styles.pillActive]}><Text style={styles.pillText}>Protein</Text></Pressable>
                          <Pressable onPress={() => setNutrient('fluids')} style={[styles.pill, nutrient==='fluids' && styles.pillActive]}><Text style={styles.pillText}>Fluids</Text></Pressable>
                        </View>
                        <View style={{marginTop:8, alignItems:'center'}}>
                          {(() => {
                            const vals = history.map(h => (h[nutrient] == null ? null : h[nutrient]));
                            // compute number of days in the selected range
                            let days = 1;
                            if (timeframe === 'today') {
                              days = 1;
                            } else if (timeframe === 'week') {
                              days = 7;
                            } else if (timeframe === 'month') {
                              days = 30;
                            } else if (timeframe === 'year') {
                              days = 365;
                            } else {
                              // custom: compute inclusive days between start/end
                              const { start: _nStart, end: _nEnd } = buildRangeFor(timeframe);
                              const msPerDayN = 24 * 60 * 60 * 1000;
                              const nStart = new Date(_nStart);
                              const nEnd = new Date(_nEnd);
                              nStart.setHours(0,0,0,0);
                              nEnd.setHours(0,0,0,0);
                              days = Math.max(1, Math.floor((nEnd.getTime() - nStart.getTime()) / msPerDayN) + 1);
                            }
                            const valid = vals.filter(v => v != null).map(v => Number(v));
                            const avg = valid.length ? Math.round((valid.reduce((a,b) => a+b,0)/valid.length)*10)/10 : 0;
                            const met = vals.filter(v => v != null && patient && ((nutrient==='calories' && patient.calorieGoal!=null && v>=patient.calorieGoal) || (nutrient==='protein' && patient.proteinGoal!=null && v>=patient.proteinGoal) || (nutrient==='fluids' && patient.fluidGoal!=null && v>=patient.fluidGoal))).length;
                            const pct = days>0 ? Math.round((met/days)*100) : 0;
                            const goalVal = nutrient === 'calories' ? patient?.calorieGoal ?? null : nutrient === 'protein' ? patient?.proteinGoal ?? null : patient?.fluidGoal ?? null;
                            return (
                              <View style={{alignItems:'center'}}>
                                <Text style={{color:'#3F5E52', fontWeight:'600'}}>{`Avg: ${avg} — Goal: ${goalVal ?? 'n/a'}`}</Text>
                                <Text style={{color:'#3F5E52', fontWeight:'600'}}>{`Met goal ${met} of ${days} days (${pct}%)`}</Text>
                              </View>
                            );
                          })()}
                        </View>
                        {/* x-axis labels removed per design */}
                      </>
                  )}
                </View>
              </View>
            </View>

            {/* Notes Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Clinical Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes ?? ""}
                onChangeText={setNotes}
                placeholder="Add notes about this patient..."
                placeholderTextColor="#7A9C8A"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Pressable 
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                onPress={handleSaveNotes}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Notes</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFDF4",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  removeButtonHeader: {
    backgroundColor: '#FFF4F4',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#F87171',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTextHeader: {
    color: '#C02626',
    fontWeight: '700',
    fontSize: 12,
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },

  /* Loading */
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },

  /* Cards */
  card: {
    backgroundColor: "#FFF8E7",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#004734",
    marginBottom: 16,
  },

  /* Detail Rows */
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E3D4",
  },
  detailLabel: {
    fontSize: 14,
    color: "#3F5E52",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#004734",
    fontWeight: "600",
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#004734",
  },
  statLabel: {
    fontSize: 12,
    color: "#3F5E52",
    fontWeight: "500",
    textAlign: "center",
  },

  /* Macros */
  macrosGrid: {
    flexDirection: "row",
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#FFFDF4",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  macroLabel: {
    fontSize: 12,
    color: "#3F5E52",
    fontWeight: "600",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#004734",
  },
  macroGoal: {
    fontSize: 11,
    color: "#7A9C8A",
    fontWeight: "500",
  },

  /* Notes */
  notesInput: {
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#D6C89A",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#004734",
    minHeight: 120,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: "#009235",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  pill: {
    backgroundColor: '#FFFDF4',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E8E3D4',
  },
  pillActive: {
    backgroundColor: '#009235',
    borderColor: '#009235',
  },
  pillText: {
    color: '#004734',
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#FFFDF4',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D6C89A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});