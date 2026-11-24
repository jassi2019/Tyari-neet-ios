import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { INDIAN_STATES } from '@/constants/indianStates';

// Billing address shown on the payment screen. The GST invoice needs a name, address and
// state (the state decides SGST+CGST vs IGST), so payment stays disabled until these are
// filled. Saved on the user, so a returning student only confirms it.
export type TBillingAddress = {
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
};

export const isBillingAddressComplete = (a: TBillingAddress): boolean =>
  a.name.trim().length > 1 &&
  a.addressLine.trim().length > 4 &&
  a.city.trim().length > 1 &&
  !!a.state.trim() &&
  /^[1-9][0-9]{5}$/.test(a.pincode.trim()) &&
  /^[6-9][0-9]{9}$/.test(a.phone.replace(/\D/g, '').slice(-10));

type Props = {
  value: TBillingAddress;
  onChange: (next: TBillingAddress) => void;
  editable?: boolean;
};

export default function BillingAddressCard({ value, onChange, editable = true }: Props) {
  const [statesOpen, setStatesOpen] = React.useState(false);
  const set = (k: keyof TBillingAddress, v: string) => onChange({ ...value, [k]: v });
  const complete = isBillingAddressComplete(value);
  const [collapsed, setCollapsed] = React.useState(complete);

  React.useEffect(() => {
    // A returning student with a saved address sees it collapsed, not an empty form.
    if (complete) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (collapsed && complete) {
    return (
      <View style={st.card}>
        <View style={st.headRow}>
          <Text style={st.title}>Billing address</Text>
          <TouchableOpacity onPress={() => setCollapsed(false)} disabled={!editable}>
            <Text style={st.change}>Change</Text>
          </TouchableOpacity>
        </View>
        <Text style={st.saved}>{value.name}</Text>
        <Text style={st.savedSub}>{value.addressLine}</Text>
        <Text style={st.savedSub}>
          {value.city} - {value.pincode}, {value.state}
        </Text>
        <Text style={st.savedSub}>{value.phone}</Text>
      </View>
    );
  }

  const field = (
    label: string,
    key: keyof TBillingAddress,
    props: { placeholder?: string; keyboardType?: any; maxLength?: number; multiline?: boolean } = {}
  ) => (
    <View style={{ marginTop: 10 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput
        style={[st.input, props.multiline ? { height: 64, textAlignVertical: 'top' } : null]}
        value={value[key]}
        onChangeText={(t) => set(key, t)}
        editable={editable}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );

  return (
    <View style={st.card}>
      <View style={st.headRow}>
        <Text style={st.title}>Billing address</Text>
        <Text style={st.note}>Required for your GST invoice</Text>
      </View>

      {field('Full name', 'name', { placeholder: 'Student name', maxLength: 60 })}
      {field('Mobile number', 'phone', { placeholder: '10-digit mobile', keyboardType: 'phone-pad', maxLength: 10 })}
      {field('Address', 'addressLine', { placeholder: 'House / street / area', maxLength: 120, multiline: true })}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>{field('City', 'city', { placeholder: 'City', maxLength: 40 })}</View>
        <View style={{ width: 120 }}>
          {field('Pincode', 'pincode', { placeholder: '110001', keyboardType: 'number-pad', maxLength: 6 })}
        </View>
      </View>

      <View style={{ marginTop: 10 }}>
        <Text style={st.label}>State</Text>
        <TouchableOpacity
          style={st.input}
          activeOpacity={0.7}
          disabled={!editable}
          onPress={() => setStatesOpen((v) => !v)}
        >
          <Text style={{ color: value.state ? '#1F2937' : '#9CA3AF', fontSize: 14, lineHeight: 20 }}>
            {value.state || 'Select your state'}
          </Text>
        </TouchableOpacity>
        {/* A Modal, not an inline list: a nested list inside the screen's ScrollView
            cannot be scrolled, which used to hide every state after the sixth. */}
        <Modal visible={statesOpen} transparent animationType="slide" onRequestClose={() => setStatesOpen(false)}>
          <View style={st.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatesOpen(false)} />
            <View style={st.modalSheet}>
              <View style={st.modalHead}>
                <Text style={st.modalTitle}>Select your state</Text>
                <TouchableOpacity onPress={() => setStatesOpen(false)} hitSlop={12}>
                  <Text style={st.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                {INDIAN_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[st.stateItem, value.state === s && st.stateItemOn]}
                    onPress={() => {
                      set('state', s);
                      setStatesOpen(false);
                    }}
                  >
                    <Text style={[st.stateText, value.state === s && st.stateTextOn]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>

      <Text style={st.legal}>
        Indian tax law requires your address on the GST invoice we email you after payment.
      </Text>
      {!complete && <Text style={st.hint}>Fill all fields to continue to payment.</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  note: { fontSize: 11, color: '#6B7280' },
  change: { fontSize: 13, fontWeight: '700', color: '#F1BB3E' },
  saved: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginTop: 8 },
  savedSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  label: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  modalClose: { fontSize: 16, color: '#6B7280', fontWeight: '700' },
  stateItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  stateItemOn: { backgroundColor: '#FEF3C7' },
  stateText: { fontSize: 13.5, color: '#1F2937' },
  stateTextOn: { fontWeight: '700' },
  legal: { fontSize: 11, color: '#6B7280', marginTop: 12, lineHeight: 15 },
  hint: { fontSize: 11.5, color: '#B45309', marginTop: 12 },
});
