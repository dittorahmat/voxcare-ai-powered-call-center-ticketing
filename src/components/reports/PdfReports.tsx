import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
  ],
});

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Roboto' },
  header: { marginBottom: 20, borderBottom: 2, borderColor: '#6366f1', paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#6366f1' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#334155' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 4, fontSize: 9, fontWeight: 'bold', color: '#64748b' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#f1f5f9', paddingBottom: 3, fontSize: 9 },
  cell1: { flex: 1 },
  cell2: { flex: 2 },
  cell3: { flex: 1, textAlign: 'center' },
  cell4: { flex: 1, textAlign: 'center' },
  statCard: { padding: 10, backgroundColor: '#f8fafc', borderRadius: 4, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#6366f1' },
  statLabel: { fontSize: 9, color: '#64748b' },
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8 },
});

interface ReportProps {
  companyName?: string;
  dateRange?: string;
  generatedAt?: string;
  volumeData?: any;
  slaData?: any;
  agentData?: any[];
  csatData?: any;
  fcrData?: number;
  ahtData?: number;
}

export function TicketSummaryReport({ companyName = 'VoxCare', dateRange = '', generatedAt = new Date().toLocaleString(), volumeData, slaData, agentData, csatData, fcrData, ahtData }: ReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{companyName} — Ticket Summary Report</Text>
          <Text style={styles.subtitle}>Period: {dateRange} · Generated: {generatedAt}</Text>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statLabel}>Total Tickets</Text>
              <Text style={styles.statValue}>{volumeData?.total || 0}</Text>
            </View>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statLabel}>Resolved</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{volumeData?.byStatus?.resolved || 0}</Text>
            </View>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statLabel}>SLA Compliance</Text>
              <Text style={styles.statValue}>{slaData?.rate || 0}%</Text>
            </View>
          </View>
          {fcrData !== undefined && (
            <View style={[styles.statCard, { marginTop: 8 }]}>
              <Text style={styles.statLabel}>First Contact Resolution</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{fcrData}%</Text>
            </View>
          )}
          {ahtData !== undefined && (
            <View style={[styles.statCard, { marginTop: 8 }]}>
              <Text style={styles.statLabel}>Avg Handle Time</Text>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>{Math.floor(ahtData / 60)}h {ahtData % 60}m</Text>
            </View>
          )}
        </View>

        {volumeData?.byCategory && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tickets by Category</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.cell1}>Category</Text>
              <Text style={styles.cell3}>Count</Text>
            </View>
            {Object.entries(volumeData.byCategory).map(([name, count]: [string, any]) => (
              <View key={name} style={styles.tableRow}>
                <Text style={styles.cell1}>{name}</Text>
                <Text style={styles.cell3}>{count as number}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>{companyName} · Confidential · {generatedAt}</Text>
      </Page>
    </Document>
  );
}

export function SLAComplianceReport({ companyName = 'VoxCare', dateRange = '', generatedAt = new Date().toLocaleString(), slaData, agentData }: ReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{companyName} — SLA Compliance Report</Text>
          <Text style={styles.subtitle}>Period: {dateRange} · Generated: {generatedAt}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Overall SLA Compliance</Text>
            <Text style={styles.statValue}>{slaData?.rate || 0}%</Text>
            <Text style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>
              Compliant: {slaData?.compliant || 0} · Breached: {slaData?.breached || 0}
            </Text>
          </View>
        </View>

        {agentData && agentData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent SLA Performance</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.cell1}>Agent</Text>
              <Text style={styles.cell3}>SLA %</Text>
              <Text style={styles.cell4}>Avg Time</Text>
            </View>
            {agentData.map((a: any) => (
              <View key={a.id} style={styles.tableRow}>
                <Text style={styles.cell1}>{a.name}</Text>
                <Text style={styles.cell3}>{a.slaCompliance ?? '—'}%</Text>
                <Text style={styles.cell4}>{a.avgResolutionTime ? `${a.avgResolutionTime}m` : '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>{companyName} · Confidential · {generatedAt}</Text>
      </Page>
    </Document>
  );
}

export function AgentPerformanceReport({ companyName = 'VoxCare', dateRange = '', generatedAt = new Date().toLocaleString(), agentData, csatData, fcrData }: ReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{companyName} — Agent Performance Report</Text>
          <Text style={styles.subtitle}>Period: {dateRange} · Generated: {generatedAt}</Text>
        </View>

        {csatData && (
          <View style={styles.section}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Customer Satisfaction</Text>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>{csatData.avgRating || 0}/5</Text>
              <Text style={{ fontSize: 9, color: '#64748b' }}>Response Rate: {csatData.responseRate || 0}%</Text>
            </View>
          </View>
        )}

        {agentData && agentData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agent Metrics</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.cell1}>Agent</Text>
              <Text style={styles.cell2}>Assigned</Text>
              <Text style={styles.cell3}>FCR %</Text>
              <Text style={styles.cell4}>SLA %</Text>
            </View>
            {agentData.map((a: any) => (
              <View key={a.id} style={styles.tableRow}>
                <Text style={styles.cell1}>{a.name}</Text>
                <Text style={styles.cell2}>{a.assigned ?? 0}</Text>
                <Text style={styles.cell3}>{a.fcrRate ?? '—'}%</Text>
                <Text style={styles.cell4}>{a.slaCompliance ?? '—'}%</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer}>{companyName} · Confidential · {generatedAt}</Text>
      </Page>
    </Document>
  );
}
