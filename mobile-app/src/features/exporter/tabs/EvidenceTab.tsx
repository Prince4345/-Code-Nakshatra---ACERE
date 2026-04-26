import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildReviewCompletionTrend } from '../../shared/analytics';
import { EmptyStateCard, InsightCard, InsightGrid, SegmentedControl, TrendBars } from '../../shared/MobileInsights';
import { DocumentRecord, ExporterBundle, ExtractionRecord, MobileSyncQueueItem } from '../../../types';
import { ActionLink, Field, Section, sharedInputStyles } from '../../../components/ui';
import { palette } from '../../../theme';

const stageForDocument = (document: DocumentRecord, extraction?: ExtractionRecord) =>
  extraction?.status ?? document.ocrStatus ?? 'PENDING';

export const ExporterEvidenceTab = ({
  bundle,
  documentType,
  notes,
  activeUpload,
  syncItems,
  setDocumentType,
  setNotes,
  onCaptureDocument,
  onPickDocument,
  onRunExtraction,
  onSaveReview,
}: {
  bundle: ExporterBundle;
  documentType: string;
  notes: string;
  activeUpload?: MobileSyncQueueItem;
  syncItems: MobileSyncQueueItem[];
  setDocumentType: React.Dispatch<React.SetStateAction<string>>;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  onCaptureDocument: () => Promise<void>;
  onPickDocument: () => Promise<void>;
  onRunExtraction: (document: DocumentRecord) => Promise<void>;
  onSaveReview: (document: DocumentRecord, fields: Record<string, string>, reviewerNotes: string) => Promise<void>;
}) => {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [activeDocumentId, setActiveDocumentId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});

  const orderedDocuments = useMemo(
    () =>
      [...bundle.documents].sort((left, right) =>
        `${right.updatedAt ?? right.createdAt}`.localeCompare(`${left.updatedAt ?? left.createdAt}`),
      ),
    [bundle.documents],
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orderedDocuments.filter((document) => {
      const extraction = bundle.extractions.find((item) => item.documentId === document.id);
      const stage = stageForDocument(document, extraction);
      const matchesQuery =
        !query ||
        `${document.fileName} ${document.documentType} ${document.notes} ${extraction?.detectedDocumentType ?? ''}`
          .toLowerCase()
          .includes(query);
      return matchesQuery && (stageFilter === 'ALL' || stage === stageFilter);
    });
  }, [bundle.documents, bundle.extractions, orderedDocuments, search, stageFilter]);

  const activeDocument = filteredDocuments.find((document) => document.id === activeDocumentId) ?? filteredDocuments[0] ?? null;
  const activeExtraction = activeDocument ? bundle.extractions.find((item) => item.documentId === activeDocument.id) : undefined;

  React.useEffect(() => {
    if (!activeExtraction) {
      setDraftFields({});
      setReviewNotes('');
      return;
    }
    setDraftFields(activeExtraction.extractedFields);
    setReviewNotes(activeExtraction.reviewerNotes);
  }, [activeExtraction?.id]);

  const reviewedCount = bundle.extractions.filter((item) => item.status === 'REVIEWED').length;
  const autoDetectedCount = bundle.extractions.filter((item) => Boolean(item.detectedDocumentType)).length;
  const completionTrend = buildReviewCompletionTrend(bundle.documents, bundle.extractions);

  return (
    <ScrollView contentContainerStyle={sharedInputStyles.screenContent}>
      <Section title="Evidence intake" subtitle="Upload once, then auto-detect, review, and link the evidence cleanly.">
        <InsightGrid>
          <InsightCard label="Files" value={bundle.documents.length} helper="Evidence stored in mobile view" />
          <InsightCard label="Auto-detected" value={autoDetectedCount} helper="Documents with detected categories" />
          <InsightCard label="Reviewed" value={reviewedCount} helper={`${Math.round((reviewedCount / Math.max(bundle.documents.length, 1)) * 100)}% confirmed`} tone="good" />
          <InsightCard label="Queued uploads" value={syncItems.filter((item) => item.type === 'document-upload').length} helper="Pending or syncing evidence actions" tone="neutral" />
        </InsightGrid>
        <TrendBars title="Review trend" subtitle="Document review completion over time" data={completionTrend} />
      </Section>

      <Section title="Upload evidence">
        <Field label="Document category">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 10 }}>
            {['shipment document', 'supplier declaration', 'land record', 'electricity bill', 'fuel invoice', 'purchase order'].map((item) => (
              <Pressable
                key={item}
                onPress={() => setDocumentType(item)}
                style={[
                  sharedInputStyles.modeChip,
                  sharedInputStyles.modeChipCompact,
                  documentType === item && sharedInputStyles.modeChipActive,
                ]}
              >
                <Text style={[sharedInputStyles.modeChipText, documentType === item && sharedInputStyles.modeChipTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Field>
        <Field label="Notes">
          <TextInput
            style={[sharedInputStyles.input, sharedInputStyles.multilineInput]}
            multiline
            placeholder="Add field notes or context for the verifier."
            placeholderTextColor={palette.muted}
            value={notes}
            onChangeText={setNotes}
          />
        </Field>
        <View style={sharedInputStyles.inlineActionRow}>
          <Pressable
            style={({ pressed }) => [sharedInputStyles.primaryButton, { flex: 1 }, pressed && sharedInputStyles.buttonPressed]}
            onPress={() => void onCaptureDocument()}
            disabled={Boolean(activeUpload)}
          >
            {activeUpload ? <ActivityIndicator color={palette.text} /> : <Text style={sharedInputStyles.primaryButtonText}>Capture document</Text>}
          </Pressable>
          <Pressable
            style={({ pressed }) => [sharedInputStyles.actionLink, { paddingHorizontal: 18, paddingVertical: 16 }, pressed && sharedInputStyles.buttonPressed]}
            onPress={() => void onPickDocument()}
            disabled={Boolean(activeUpload)}
          >
            <Text style={sharedInputStyles.actionLinkText}>Pick file</Text>
          </Pressable>
        </View>
        {activeUpload ? (
          <View style={sharedInputStyles.noteCard}>
            <Text style={sharedInputStyles.cardTitle}>Uploading now</Text>
            <Text style={sharedInputStyles.cardSubtitle}>Your document is syncing in the background.</Text>
            <View style={sharedInputStyles.progressTrack}>
              <View style={[sharedInputStyles.progressFill, { width: `${Math.max(activeUpload.progress, 10)}%` }]} />
            </View>
          </View>
        ) : null}
      </Section>

      <Section title="Evidence library" action={`${filteredDocuments.length} shown`}>
        <Field label="Search evidence">
          <TextInput
            style={sharedInputStyles.input}
            placeholder="File name, notes, or type"
            placeholderTextColor={palette.muted}
            value={search}
            onChangeText={setSearch}
          />
        </Field>
        <SegmentedControl
          value={stageFilter}
          onChange={setStageFilter}
          options={[
            { value: 'ALL', label: 'All', badge: bundle.documents.length },
            { value: 'PENDING', label: 'Pending', badge: bundle.documents.filter((document) => stageForDocument(document, bundle.extractions.find((item) => item.documentId === document.id)) === 'PENDING').length },
            { value: 'EXTRACTED', label: 'Extracted', badge: bundle.extractions.filter((item) => item.status === 'EXTRACTED').length },
            { value: 'REVIEWED', label: 'Reviewed', badge: reviewedCount },
          ]}
        />
        {filteredDocuments.length ? (
          filteredDocuments.map((document) => {
            const extraction = bundle.extractions.find((item) => item.documentId === document.id);
            const stage = stageForDocument(document, extraction);
            return (
              <View key={document.id} style={sharedInputStyles.richCard}>
                <View style={sharedInputStyles.richCardTop}>
                  <View style={sharedInputStyles.richCardCopy}>
                    <Text style={sharedInputStyles.cardTitle}>{document.fileName}</Text>
                    <Text style={sharedInputStyles.cardSubtitle}>{(extraction?.detectedDocumentType ?? document.documentType) || 'Awaiting classification'}</Text>
                  </View>
                  <Text style={[sharedInputStyles.actionLinkText, { color: stage === 'REVIEWED' ? palette.goodLine : stage === 'EXTRACTED' ? palette.brandBright : '#facc15' }]}>{stage}</Text>
                </View>
                <Text style={sharedInputStyles.cardSubtitle}>{document.notes || 'No notes yet.'}</Text>
                <View style={sharedInputStyles.inlineActionRow}>
                  <ActionLink label="Open" onPress={() => setActiveDocumentId(document.id)} />
                  <ActionLink label="Source" onPress={() => void Linking.openURL(document.previewUrl)} />
                  <ActionLink label="Extract" onPress={() => void onRunExtraction(document)} />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyStateCard title="No evidence in this view." description="Clear the filters or upload a fresh document." />
        )}
      </Section>

      <Section title="Extraction review" action={activeDocument ? activeDocument.fileName : 'No document'}>
        {activeDocument ? (
          <>
            <View style={sharedInputStyles.noteCard}>
              <Text style={sharedInputStyles.cardTitle}>{activeDocument.fileName}</Text>
              <Text style={sharedInputStyles.cardSubtitle}>{(activeExtraction?.detectedDocumentType ?? activeDocument.documentType) || 'Awaiting document type'}</Text>
            </View>
            <InsightGrid>
              <InsightCard label="Status" value={stageForDocument(activeDocument, activeExtraction)} helper="Current extraction stage" tone={stageForDocument(activeDocument, activeExtraction) === 'REVIEWED' ? 'good' : 'neutral'} />
              <InsightCard label="Confidence" value={`${Math.round((activeExtraction?.confidence ?? 0) * 100)}%`} helper={(activeExtraction?.providerModel ?? activeExtraction?.provider) || 'Awaiting provider'} />
            </InsightGrid>
            {Object.keys(draftFields).length ? (
              Object.entries(draftFields).map(([key, value]) => (
                <Field key={key} label={key}>
                  <TextInput
                    style={sharedInputStyles.input}
                    value={value}
                    onChangeText={(next) => setDraftFields((current) => ({ ...current, [key]: next }))}
                    placeholderTextColor={palette.muted}
                  />
                </Field>
              ))
            ) : (
              <View style={sharedInputStyles.noteCard}>
                <Text style={sharedInputStyles.cardSubtitle}>Run extraction to generate editable structured fields.</Text>
              </View>
            )}
            <Field label="Reviewer notes">
              <TextInput
                style={[sharedInputStyles.input, sharedInputStyles.multilineInput]}
                multiline
                value={reviewNotes}
                onChangeText={setReviewNotes}
                placeholder="Confirm what was extracted and note any corrections."
                placeholderTextColor={palette.muted}
              />
            </Field>
            <View style={sharedInputStyles.inlineActionRow}>
              <ActionLink label="Open source" onPress={() => void Linking.openURL(activeDocument.previewUrl)} />
              <ActionLink label="Re-run extraction" onPress={() => void onRunExtraction(activeDocument)} />
            </View>
            <Pressable
              style={({ pressed }) => [sharedInputStyles.primaryButton, pressed && sharedInputStyles.buttonPressed]}
              onPress={() => void onSaveReview(activeDocument, draftFields, reviewNotes)}
            >
              <Text style={sharedInputStyles.primaryButtonText}>Save reviewed extraction</Text>
            </Pressable>
          </>
        ) : (
          <EmptyStateCard title="No document selected." description="Pick a document from the evidence library to review extracted fields." />
        )}
      </Section>
    </ScrollView>
  );
};
