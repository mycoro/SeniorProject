import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, SafeAreaView, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useUser } from "@/context/UserContext";
import { API_BASE_URL } from "@/config/api";
import { auth } from "@/config/firebase";
import * as Clipboard from 'expo-clipboard';

export default function DoctorInvites() {
  const { userProfile } = useUser();
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [invitesError, setInvitesError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async function loadInvites() {
      try {
        setLoadingInvites(true);
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const idToken = await user.getIdToken();
        console.log('DoctorInvites: idToken present?', Boolean(idToken));
        const r = await fetch(`${API_BASE_URL}/api/doctor/invites`, { headers: { Authorization: `Bearer ${idToken}` } });
        let j = null;
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          j = await r.json().catch(() => null);
        } else {
          // Non-JSON response (likely HTML error) — read as text for better diagnostics
          const txt = await r.text().catch(() => null);
          console.warn('DoctorInvites: non-json response:', txt?.slice?.(0, 500));
          j = null;
        }
        if (!r.ok) {
          const msg = j && (j.error || j.message) ? (j.error || j.message) : `HTTP ${r.status}`;
          if (mounted) setInvitesError(String(msg));
          return;
        }
        if (mounted) { setInvites(j?.invites || []); setInvitesError(null); }
      } catch (err) {
        console.error('Error loading invites:', err);
        if (mounted) setInvitesError(err && (err as any).message ? String((err as any).message) : 'Failed to load invites');
      } finally { if (mounted) setLoadingInvites(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const handleGenerateInvite = async () => {
    if (!inviteName.trim()) return Alert.alert("Invite name", "Please enter the invitee's name.");
    setInviteLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const idToken = await user.getIdToken();
      console.log('Generate invite: idToken present?', Boolean(idToken));
      const res = await fetch(`${API_BASE_URL}/api/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ttlHours: 72, inviteeName: inviteName.trim() }),
      });
      let json: any = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        json = await res.json().catch(() => null);
      } else {
        const txt = await res.text().catch(() => null);
        console.warn('Generate invite: non-json response:', txt?.slice?.(0, 500));
        throw new Error(`Unexpected response: ${res.status}`);
      }
      if (!res.ok) throw new Error(json.error || 'Failed to create invite');
      setInviteCode(json.code);
      setInviteName('');
      // refresh
      const r2 = await fetch(`${API_BASE_URL}/api/doctor/invites`, { headers: { Authorization: `Bearer ${idToken}` } });
      const j2 = await r2.json().catch(() => null);
      if (r2.ok) setInvites(j2?.invites || []);
      // optional autolink by email not implemented here
    } catch (err: any) {
      console.error('Generate invite error:', err);
      Alert.alert('Error', err.message || String(err));
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi {userProfile?.name?.split(" ")[0] || "Doctor"}!</Text>
          <Text style={styles.subGreeting}>Invite patients</Text>
        </View>

        <View style={styles.inviteForm}>
          <TextInput style={[styles.searchInput, { paddingLeft: 12 }]} placeholder="Invitee name" placeholderTextColor="#7A9C8A" value={inviteName} onChangeText={setInviteName} autoCapitalize="words" />
          <View style={{ height: 8 }} />
          <TextInput style={[styles.searchInput, { paddingLeft: 12 }]} placeholder="Optional email (will auto-assign if exists)" placeholderTextColor="#7A9C8A" value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" keyboardType="email-address" />
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => { setInviteName(''); setInviteEmail(''); setInviteCode(null); setCopied(false); }} style={{ paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 }}>
              <Text style={{ color: '#7A9C8A' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleGenerateInvite} style={styles.generateButton}><Text style={styles.generateButtonText}>{inviteLoading ? '...' : 'Generate code'}</Text></Pressable>
          </View>

          {inviteCode ? (
            <View style={styles.codeDisplay}>
              <Text style={styles.codeText}>{inviteCode}</Text>
              <Pressable onPress={async () => { try { await Clipboard.setStringAsync(inviteCode); setCopied(true); Alert.alert('Copied', 'Code copied to clipboard'); } catch (e) { console.error(e); } }} style={styles.copyButton}><Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text></Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.inviteSection}>
          <Text style={styles.sectionTitle}>Invites</Text>
          {loadingInvites ? (
            <View style={{ padding: 12 }}><ActivityIndicator size="small" color="#009235" /></View>
          ) : invitesError ? (
            <Text style={{ padding: 12, color: '#ff4d4f' }}>Error loading invites: {invitesError}</Text>
          ) : invites.length === 0 ? (
            <Text style={{ padding: 12, color: '#7A9C8A' }}>No invites yet</Text>
          ) : (
            invites.map((inv) => (
              <View key={inv.inviteId} style={styles.inviteCard}>
                <View style={styles.inviteCardLeft}>
                  <Text style={styles.inviteCodeLarge}>{inv.code}</Text>
                  <Text style={styles.inviteMeta}>{inv.inviteeName || 'No name'} · {inv.createdAt ? new Date(inv.createdAt).toLocaleString() : ''}</Text>
                  <Text style={[styles.statusBadge, { backgroundColor: inv.status === 'used' ? '#9CA3AF' : inv.status === 'expired' ? '#FF7A2F' : '#009235' }]}>{inv.status}</Text>
                </View>
                <View style={styles.inviteCardActions}>
                  <Pressable onPress={async () => { try { await Clipboard.setStringAsync(inv.code); Alert.alert('Copied', 'Code copied to clipboard'); } catch(e){} }} style={styles.copyButton}><Text style={styles.copyText}>Copy</Text></Pressable>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFDF4" },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  header: { marginBottom: 12 },
  greeting: { fontSize: 22, fontWeight: "700", color: "#0B6E4F", marginBottom: 4 },
  subGreeting: { fontSize: 14, color: "#666" },
  inviteForm: { marginTop: 10, padding: 12, backgroundColor: '#FFFDF4', borderRadius: 12, borderWidth: 1, borderColor: '#E8E3D4' },
  searchInput: { flex: 1, fontSize: 16, color: '#004734', backgroundColor: '#FFFDF4' },
  generateButton: { backgroundColor: '#009235', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  generateButtonText: { color: '#fff', fontWeight: '800' },
  codeDisplay: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E8E3D4' },
  codeText: { fontSize: 18, fontWeight: '900', color: '#004734', letterSpacing: 2 },
  inviteSection: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#E8E3D4', backgroundColor: '#FFF8E7' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#004734', marginBottom: 8 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#FFFFFF', marginHorizontal: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E8E3D4' },
  inviteCardLeft: { flex: 1, paddingRight: 8 },
  inviteCodeLarge: { fontSize: 20, fontWeight: '900', color: '#004734', letterSpacing: 2 },
  inviteMeta: { fontSize: 12, color: '#3F5E52', marginTop: 2 },
  inviteCardActions: { alignItems: 'center', justifyContent: 'center' },
  copyButton: { backgroundColor: '#009235', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  copyText: { color: '#fff', fontWeight: '800' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontWeight: '700', marginTop: 6, fontSize: 12, overflow: 'hidden', color: '#fff' },
});
