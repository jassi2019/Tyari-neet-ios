import React from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Display-only plan card for the Plans screen ("admit card" look). It only shows a
// plan; selecting it and paying stay in Plans.tsx / Payment.tsx exactly as before.
//
// The admin writes the plan description in the portal in a light markdown style:
//   MRP: ₹9,999                 -> crossed-out price + "50% OFF" ribbon
//   **COMPLETE NEET ...**       -> bold headline lines
//   *One Plan. Complete ...*    -> tagline
//   ## ✓ Hidden Links           -> a feature section
//   ✓ Hidden NCERT Connections  -> a feature inside the current section
//   ---                         -> anything after it is the closing slogan
// Old plain descriptions ("- feature" per line) still show as a simple list.

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Section = { title: string; items: string[] };
type Parsed = { mrp: number | null; headlines: string[]; tagline: string | null; intro: string[]; sections: Section[]; slogan: string[] };

const stripMarks = (s: string) => s.replace(/^[-*•]\s+/, '').replace(/^✓\s*/, '').trim();

export const parsePlanDescription = (description?: string | null): Parsed => {
  const out: Parsed = { mrp: null, headlines: [], tagline: null, intro: [], sections: [], slogan: [] };
  let afterRule = false;
  for (const raw of String(description || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const mrp = line.match(/^MRP\s*[:\-]?\s*₹?\s*([\d,]+)/i);
    if (mrp) { out.mrp = Number(mrp[1].replace(/,/g, '')) || null; continue; }
    if (/^-{3,}$/.test(line)) { afterRule = true; continue; }
    if (/^#\s/.test(line)) continue; // the plan name is shown already
    if (/valid until/i.test(line)) continue; // validity comes from the plan itself
    if (afterRule) { out.slogan.push(line.replace(/\*+/g, '').trim()); continue; }
    if (/^#{2,}\s/.test(line)) {
      out.sections.push({ title: stripMarks(line.replace(/^#+\s*/, '')), items: [] });
      continue;
    }
    if (/^\*\*[^*].*\*\*$/.test(line)) { out.headlines.push(line.replace(/\*+/g, '').trim()); continue; }
    if (/^\*[^*].*\*$/.test(line)) { out.tagline = line.replace(/\*+/g, '').trim(); continue; }
    const item = stripMarks(line);
    if (!item) continue;
    const current = out.sections[out.sections.length - 1];
    if (current) current.items.push(item);
    else out.intro.push(item);
  }
  return out;
};

// "**Bold part** – rest" -> bold + normal text.
const Rich = ({ text, style, boldColor }: { text: string; style: any; boldColor?: string }) => (
  <Text style={style}>
    {text.split(/\*\*([^*]+)\*\*/).map((part, i) =>
      i % 2 ? <Text key={i} style={{ fontWeight: '800', color: boldColor }}>{part}</Text> : <Text key={i}>{part}</Text>
    )}
  </Text>
);

const ICONS = ['📘', '🧠', '🔗', '🔁', '🏆', '📜', '🎯', '⚡', '📅', '📝', '🗓️', '✨'];

type Props = {
  name: string;
  isSelected: boolean;
  open: boolean;          // details shown (only one card open at a time)
  onPress: () => void;    // header / card tap: select this plan and open its details
  priceText: string;      // total incl. GST, e.g. ₹5,899
  baseText: string;       // e.g. ₹4,999 + 18% GST
  subText: string;        // validity / billing text
  baseAmount: number;     // plan amount without GST (for the % off)
  gstRate: number;
  description?: string | null;
  badge?: string | null;  // e.g. "MOST POPULAR"
  mrp?: number | null;    // admin "Discount / Offer: MRP" field (without GST)
};

export default function PlanTicketCard({ name, isSelected, open, onPress, priceText, baseText, subText, baseAmount, gstRate, description, badge, mrp }: Props) {
  const d = React.useMemo(() => parsePlanDescription(description), [description]);
  // The admin MRP field wins; an "MRP: ..." line in the description is the fallback.
  const mrpValue = Number(mrp) > 0 ? Number(mrp) : d.mrp;
  const off = mrpValue && baseAmount > 0 && mrpValue > baseAmount ? Math.round(((mrpValue - baseAmount) / mrpValue) * 100) : 0;
  const inr = (n: number) => '₹' + new Intl.NumberFormat('en-IN').format(n);
  const totalFeatures = d.sections.reduce((n, s) => n + s.items.length, 0) + d.intro.length;
  const hasDetails = totalFeatures > 0 || d.headlines.length > 0 || !!d.tagline;

  const press = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onPress();
  };

  return (
    <View style={[st.card, isSelected ? st.cardOn : st.cardOff]}>
      {/* Ticket header: tap to select this plan and open its details */}
      <TouchableOpacity activeOpacity={0.9} onPress={press} accessibilityRole="button" accessibilityState={{ expanded: open, selected: isSelected }}>
        <LinearGradient colors={['#1B2550', '#0F1733']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.head}>
          <View style={st.headTop}>
            <Text style={st.kicker}>NEET ADMIT PASS</Text>
            <View style={[st.radio, isSelected && st.radioOn]}>{isSelected ? <Text style={st.radioTick}>✓</Text> : null}</View>
          </View>
          <Text style={st.name}>{name}</Text>
          <Text style={st.valid}>{subText}</Text>
          {badge ? <View style={st.badge}><Text style={st.badgeText}>{badge}</Text></View> : null}
          {off > 0 ? (
            <View style={st.ribbon}><Text style={st.ribbonText}>{off}% OFF</Text></View>
          ) : null}
        </LinearGradient>

        {/* Perforation */}
        <View style={st.perfRow}>
          <View style={[st.notch, st.notchL]} />
          <View style={st.perfLine} />
          <View style={[st.notch, st.notchR]} />
        </View>

        {/* Price */}
        <View style={st.priceRow}>
          <View>
            {mrpValue && off > 0 ? <Text style={st.mrpRow}><Text style={st.mrp}>MRP {inr(mrpValue)}</Text>{'  '}<Text style={st.offInline}>{off}% OFF</Text></Text> : null}
            <Text style={st.price}>{priceText}</Text>
            <Text style={st.base}>{baseText} · total, GST included</Text>
          </View>
          {off > 0 && mrpValue ? (
            <View style={st.save}>
              <Text style={st.saveLbl}>Aap bachate ho</Text>
              <Text style={st.saveAmt}>{inr(Math.round(mrpValue - baseAmount))}</Text>
            </View>
          ) : null}
        </View>

        {hasDetails ? (
          <View style={[st.more, open && st.moreOpen]}>
            <Text style={[st.moreText, open && st.moreTextOpen]}>
              {open ? 'Details band karo ▲' : `Plan mein kya milega? ${totalFeatures}+ features dekho ▼`}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {open ? (
        <View style={{ paddingTop: 4 }}>
          {/* Headline + tagline */}
          {d.headlines.length || d.tagline ? (
            <View style={st.block}>
              {d.headlines.map((h, i) => <Text key={i} style={st.headline}>{h}</Text>)}
              {d.tagline ? <Text style={st.tagline}>{d.tagline}</Text> : null}
            </View>
          ) : null}

          {/* Intro bullets (e.g. syllabus promise, or an old-style plain list) */}
          {d.intro.length ? (
            <View style={st.block}>
              {d.intro.map((t, i) => (
                <View key={i} style={st.item}>
                  <Text style={st.tick}>✓</Text>
                  <Rich text={t} style={st.itemText} boldColor="#1B2550" />
                </View>
              ))}
            </View>
          ) : null}

          {/* Feature sections */}
          {d.sections.map((sec, i) => (
            <View key={i} style={st.section}>
              <View style={st.secHead}>
                <Text style={st.secIcon}>{ICONS[i % ICONS.length]}</Text>
                <Text style={st.secTitle}>{sec.title}</Text>
                <Text style={st.secCount}>{sec.items.length}</Text>
              </View>
              {sec.items.map((t, j) => (
                <View key={j} style={st.item}>
                  <Text style={st.tick}>✓</Text>
                  <Rich text={t} style={st.itemText} boldColor="#1B2550" />
                </View>
              ))}
            </View>
          ))}

          {d.slogan.length ? (
            <View style={st.slogan}>
              {d.slogan.map((s, i) => <Text key={i} style={st.sloganText}>{s}</Text>)}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 18, overflow: 'hidden', shadowColor: '#1B2550', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardOff: { borderWidth: 1, borderColor: '#E8E1D3' },
  cardOn: { borderWidth: 2.5, borderColor: '#F1BB3E' },
  head: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
  headTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#F6C228', fontSize: 10.5, fontWeight: '800', letterSpacing: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#8D97BD', alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: '#F6C228', borderColor: '#F6C228' },
  radioTick: { color: '#0F1733', fontWeight: '900', fontSize: 13 },
  name: { color: '#FFFFFF', fontSize: 23, fontWeight: '800', marginTop: 8, paddingRight: 80 },
  valid: { color: '#C9D2F0', fontSize: 12.5, marginTop: 3 },
  badge: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: 'rgba(246,194,40,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(246,194,40,0.5)' },
  badgeText: { color: '#F6C228', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ribbon: { position: 'absolute', right: -44, top: 58, transform: [{ rotate: '35deg' }], backgroundColor: '#E53935', paddingVertical: 5, width: 160, alignItems: 'center' },
  ribbonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.8 },
  perfRow: { flexDirection: 'row', alignItems: 'center', height: 18, marginTop: -9 },
  notch: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FDF6F0' },
  notchL: { marginLeft: -9 },
  notchR: { marginRight: -9 },
  perfLine: { flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#E3D9C4', marginHorizontal: 6 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  mrpRow: { fontSize: 13 },
  mrp: { fontSize: 13, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '600' },
  offInline: { fontSize: 12, color: '#E53935', fontWeight: '900' },
  price: { fontSize: 32, fontWeight: '900', color: '#0A7A3C', marginTop: 1 },
  base: { fontSize: 11.5, color: '#6B7280', marginTop: 1 },
  save: { alignItems: 'flex-end', backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  saveLbl: { fontSize: 10, color: '#2E7D32', fontWeight: '700' },
  saveAmt: { fontSize: 16, color: '#1B5E20', fontWeight: '900' },
  block: { paddingHorizontal: 18, paddingBottom: 10 },
  headline: { fontSize: 13.5, fontWeight: '900', color: '#1B2550', letterSpacing: 0.3 },
  tagline: { fontSize: 13, fontStyle: 'italic', color: '#B26A00', marginTop: 3 },
  section: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#FFF9EC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F4E6C3' },
  secHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  secIcon: { fontSize: 16, marginRight: 8 },
  secTitle: { flex: 1, fontSize: 14.5, fontWeight: '800', color: '#1B2550' },
  secCount: { fontSize: 11, fontWeight: '800', color: '#B26A00', backgroundColor: '#FDEBC0', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 5 },
  tick: { color: '#0A7A3C', fontWeight: '900', fontSize: 13, width: 18, marginTop: 1 },
  itemText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  more: { marginHorizontal: 12, marginBottom: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#1B2550', paddingVertical: 10, alignItems: 'center' },
  moreOpen: { backgroundColor: '#1B2550' },
  moreTextOpen: { color: '#F6C228' },
  moreText: { color: '#1B2550', fontWeight: '800', fontSize: 13 },
  slogan: { backgroundColor: '#1B2550', paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  sloganText: { color: '#F6C228', fontWeight: '900', fontSize: 12.5, textAlign: 'center', letterSpacing: 0.5, marginVertical: 1 },
});
