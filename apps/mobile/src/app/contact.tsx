import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';

import { buildContactPayload, isValidEnquiry } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  Checkbox,
  Screen,
  SelectField,
  TextField,
  cardShell,
  color,
  KEYBOARD_SAFETY_PADDING_LARGE,
  useScrollToFocusedInput,
  useTheme,
} from '@tourism/mobile-ui';

import {
  EnquiryStatus,
  EnquirySuccess,
  type EnquiryFormStatus,
} from '../components/enquiry-feedback';
import { fetchActiveCategories } from '../lib/api/categories';
import { submitEnquiry } from '../lib/api/enquiry';

export default function ContactScreen() {
  const { tour: tourPrefill } = useLocalSearchParams<{ tour?: string }>();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const copy = messages.contact;
  const inquiry = copy.inquiry;
  const f = inquiry.form;
  const ef = messages.enquiryForm;

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const firstNameRef = useRef<View>(null);
  const lastNameRef = useRef<View>(null);
  const emailRef = useRef<View>(null);
  const messageRef = useRef<View>(null);
  const formFooterRef = useRef<View>(null);
  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);

  const { scrollToInput, onScroll } = useScrollToFocusedInput(scrollRef, contentRef, {
    headerHeight,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [message, setMessage] = useState('');
  const [terms, setTerms] = useState(false);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [status, setStatus] = useState<EnquiryFormStatus>('idle');

  const interestOptions = useMemo(
    () => (categoryNames.length > 0 ? categoryNames : [...f.interestOptions]),
    [categoryNames, f.interestOptions],
  );

  const stackNameFields = width < 400;

  useEffect(() => {
    void fetchActiveCategories().then((cats) =>
      setCategoryNames(cats.map((c) => c.name)),
    );
  }, []);

  useEffect(() => {
    if (typeof tourPrefill === 'string' && tourPrefill.length > 0) {
      setMessage(messages.tourDetail.enquireHeading(tourPrefill));
    }
  }, [tourPrefill]);

  const styles = createStyles(theme, stackNameFields);

  async function onSubmit() {
    const payload = buildContactPayload({
      firstName,
      lastName,
      email,
      interest,
      message,
      website: '',
    });
    if (!isValidEnquiry(payload) || !terms) {
      setStatus('invalid');
      return;
    }
    setStatus('submitting');
    const result = await submitEnquiry(payload);
    setStatus(
      result.ok ? 'success' : result.rateLimited ? 'rateLimited' : 'error',
    );
    if (result.ok) {
      setMessage('');
      setTerms(false);
    }
  }

  function openDetail(detail: { label: string; value: string }) {
    if (detail.label === 'Email') {
      void Linking.openURL(`mailto:${detail.value}`);
      return;
    }
    if (detail.label === 'Phone') {
      void Linking.openURL(`tel:${detail.value.replace(/\s/g, '')}`);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: copy.heading }} />
      <Screen
        ref={scrollRef}
        contentRef={contentRef}
        keyboardAware
        largeTitle={false}
        scrollProps={{
          keyboardShouldPersistTaps: 'handled',
          onScroll,
          scrollEventThrottle: 16,
        }}
      >
        <View style={styles.intro}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <AppText variant="body" muted>
              {inquiry.eyebrow}
            </AppText>
          </View>
          <AppText
            variant="title"
            serif
            style={width >= 768 ? styles.inquiryHeadingLg : undefined}
          >
            {inquiry.heading}
          </AppText>
          <AppText variant="bodyLarge" muted>
            {inquiry.body}
          </AppText>
        </View>

        <View style={styles.quickCard}>
          {inquiry.details.map((detail) => {
            const tappable = detail.label === 'Email' || detail.label === 'Phone';
            const iconName =
              detail.label === 'Phone'
                ? 'call-outline'
                : detail.label === 'Email'
                  ? 'mail-outline'
                  : 'location-outline';
            return (
              <Pressable
                key={detail.label}
                disabled={!tappable}
                onPress={() => openDetail(detail)}
                style={({ pressed }) => [
                  styles.detailRow,
                  tappable && pressed ? styles.detailRowPressed : null,
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={20}
                  color={color(theme, 'primary')}
                  style={styles.detailIcon}
                />
                <View style={styles.detailText}>
                  <AppText variant="caption" muted>
                    {detail.label}
                  </AppText>
                  <AppText variant="body" style={styles.detailValue}>
                    {detail.value}
                  </AppText>
                </View>
                {tappable ? (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={color(theme, 'muted-foreground')}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.formCard}>
          {status === 'success' ? (
            <EnquirySuccess />
          ) : (
            <>
              <AppText variant="headline" style={styles.formTitle}>
                {f.title}
              </AppText>
              <View style={styles.form}>
                <View style={styles.nameRow}>
                  <View style={styles.nameField}>
                    <TextField
                      ref={firstNameRef}
                      inputRef={firstNameInputRef}
                      label={f.firstNameLabel}
                      placeholder={f.firstNamePlaceholder}
                      value={firstName}
                      onChangeText={setFirstName}
                      autoComplete="given-name"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => lastNameInputRef.current?.focus()}
                      onFocus={() => scrollToInput(firstNameRef)}
                    />
                  </View>
                  <View style={styles.nameField}>
                    <TextField
                      ref={lastNameRef}
                      inputRef={lastNameInputRef}
                      label={f.lastNameLabel}
                      placeholder={f.lastNamePlaceholder}
                      value={lastName}
                      onChangeText={setLastName}
                      autoComplete="family-name"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => emailInputRef.current?.focus()}
                      onFocus={() => scrollToInput(lastNameRef)}
                    />
                  </View>
                </View>
                <TextField
                  ref={emailRef}
                  inputRef={emailInputRef}
                  label={f.emailLabel}
                  placeholder={f.emailPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => messageInputRef.current?.focus()}
                  onFocus={() => scrollToInput(emailRef)}
                />
                <SelectField
                  label={f.interestLabel}
                  value={interest}
                  placeholder={f.interestPlaceholder}
                  options={interestOptions}
                  onValueChange={setInterest}
                />
                <View ref={formFooterRef} style={styles.formFooter} collapsable={false}>
                  <TextField
                    ref={messageRef}
                    inputRef={messageInputRef}
                    label={f.messageLabel}
                    placeholder={f.messagePlaceholder}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                    style={styles.messageInput}
                    returnKeyType="default"
                    blurOnSubmit
                    onFocus={() =>
                      scrollToInput(messageRef, {
                        safetyPadding: KEYBOARD_SAFETY_PADDING_LARGE,
                        anchorRef: formFooterRef,
                      })
                    }
                  />
                  <Checkbox
                    checked={terms}
                    onCheckedChange={setTerms}
                    label={f.terms}
                  />
                  <EnquiryStatus status={status} />
                  <Button
                    label={status === 'submitting' ? ef.submitting : f.submit}
                    onPress={() => void onSubmit()}
                    loading={status === 'submitting'}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </Screen>
    </>
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  stackNameFields: boolean,
) {
  return StyleSheet.create({
    intro: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    eyebrowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color(theme, 'primary'),
    },
    inquiryHeadingLg: {
      fontSize: 36,
      lineHeight: 40,
    },
    quickCard: {
      ...cardShell(theme),
      paddingVertical: theme.spacing.xs,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: theme.minTouch,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    detailRowPressed: {
      backgroundColor: color(theme, 'muted'),
    },
    detailIcon: {
      marginRight: theme.spacing.sm,
    },
    detailText: {
      flex: 1,
      gap: 2,
    },
    detailValue: {
      color: color(theme, 'primary'),
      fontFamily: theme.fonts.sansMedium,
    },
    formCard: {
      ...cardShell(theme),
      padding: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    formTitle: {
      marginBottom: theme.spacing.md,
      color: color(theme, 'primary'),
    },
    form: { gap: theme.spacing.md },
    formFooter: { gap: theme.spacing.md },
    nameRow: {
      flexDirection: stackNameFields ? 'column' : 'row',
      gap: theme.spacing.md,
    },
    nameField: {
      flex: stackNameFields ? undefined : 1,
    },
    messageInput: {
      minHeight: 120,
      textAlignVertical: 'top',
      paddingTop: theme.spacing.sm,
    },
  });
}
