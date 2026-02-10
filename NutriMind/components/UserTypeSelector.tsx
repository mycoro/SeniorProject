import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Leaf } from 'lucide-react-native';

type Props = {
  userType: 'patient' | 'doctor' | null;
  setUserType: (v: 'patient' | 'doctor' | null) => void;
};

export default function UserTypeSelector({ userType, setUserType }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <Leaf size={20} color="#008080" />
        </View>
        <View>
          <Text style={styles.cardTitle}>Account Type</Text>
          <Text style={styles.cardSubtitle}>Are you a patient or a doctor?</Text>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Pressable
          onPress={() => setUserType('patient')}
          style={[
            styles.typeOption,
            userType === 'patient' && styles.typeOptionActive,
          ]}
        >
          <Text style={[styles.typeOptionText, userType === 'patient' && styles.typeOptionTextActive]}>Patient</Text>
          <Text style={styles.typeOptionHint}>Track meals, fluids, and recovery</Text>
        </Pressable>

        <Pressable
          onPress={() => setUserType('doctor')}
          style={[
            styles.typeOption,
            userType === 'doctor' && styles.typeOptionActive,
          ]}
        >
          <Text style={[styles.typeOptionText, userType === 'doctor' && styles.typeOptionTextActive]}>Doctor</Text>
          <Text style={styles.typeOptionHint}>Invite and manage patients (requires verification)</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF8E7',
    borderRadius: 24,
    padding: 22,
    gap: 22,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#009235',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    color: '#004734',
    fontSize: 18,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#3F5E52',
    marginTop: 2,
  },
  typeOption: {
    backgroundColor: '#FFFDF4',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E3D4',
  },
  typeOptionActive: {
    backgroundColor: '#009235',
    borderColor: '#009235',
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#004734',
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  typeOptionHint: {
    fontSize: 13,
    color: '#3F5E52',
    marginTop: 6,
  },
});
