import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { messages } from '@tourism/i18n';
import {
  AppSheet,
  AppText,
  Button,
  TextField,
  useTheme,
  type AppSheetRef,
} from '@tourism/mobile-ui';
import { submitEnquiry, validateEnquiry, type EnquiryFieldErrors } from '../lib/enquiry';

const t = messages.mobile.enquiry;

export interface EnquirySheetRef {
  open(): void;
}

/**
 * "Inquire now" as a bottom sheet on the tour detail (was a route-modal).
 * Each open starts a fresh form; the thank-you beat auto-dismisses.
 */
export const EnquirySheet = forwardRef<
  EnquirySheetRef,
  { tourId: string; tourTitle: string }
>(function EnquirySheet({ tourId, tourTitle }, ref) {
  const theme = useTheme();
  const sheetRef = useRef<AppSheetRef>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<EnquiryFieldErrors>({});
  const [failure, setFailure] = useState<'generic' | 'rateLimited' | null>(null);
  const [sent, setSent] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => {
      // The sheet stays mounted — reset so every open is a fresh enquiry.
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setErrors({});
      setFailure(null);
      setSent(false);
      sheetRef.current?.present();
    },
  }));

  const mutation = useMutation({
    mutationFn: submitEnquiry,
    onSuccess: (result) => {
      if (result.ok) {
        setSent(true);
      } else {
        setFailure(result.rateLimited ? 'rateLimited' : 'generic');
      }
    },
    onError: () => setFailure('generic'),
  });

  // Auto-dismiss after the thank-you beat; cleared on unmount (no leaked timers).
  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => sheetRef.current?.dismiss(), 1500);
    return () => clearTimeout(timer);
  }, [sent]);

  const onSubmit = () => {
    const validation = validateEnquiry({ name, email, phone, message });
    setErrors(validation);
    setFailure(null);
    if (Object.keys(validation).length > 0) return;
    mutation.mutate({ name, email, phone, message, tourId });
  };

  return (
    <AppSheet ref={sheetRef} scrollable>
      <View style={{ paddingHorizontal: theme.spacing(4), gap: theme.spacing(4) }}>
        {sent ? (
          <View style={{ alignItems: 'center', gap: theme.spacing(3), paddingVertical: theme.spacing(6) }}>
            <Ionicons name="checkmark-circle" size={56} color={theme.colors['success']} />
            <AppText variant="body" style={{ textAlign: 'center' }}>
              {t.success}
            </AppText>
          </View>
        ) : (
          <>
            <View style={{ gap: theme.spacing(1) }}>
              <AppText variant="title">{t.title}</AppText>
              <AppText variant="caption" muted>
                {tourTitle}
              </AppText>
            </View>
            <TextField
              label={t.nameLabel}
              value={name}
              onChangeText={setName}
              error={errors.name ? t.errors[errors.name] : undefined}
              autoCorrect={false}
              autoComplete="name"
              textContentType="name"
            />
            <TextField
              label={t.emailLabel}
              value={email}
              onChangeText={setEmail}
              error={errors.email ? t.errors[errors.email] : undefined}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextField
              label={t.phoneLabel}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
            <TextField
              label={t.messageLabel}
              value={message}
              onChangeText={setMessage}
              error={errors.message ? t.errors[errors.message] : undefined}
              placeholder={t.messagePlaceholder}
              multiline
            />
            {failure ? (
              <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
                {failure === 'rateLimited' ? t.errors.rateLimited : t.errors.generic}
              </AppText>
            ) : null}
            <Button label={t.submit} onPress={onSubmit} loading={mutation.isPending} />
          </>
        )}
      </View>
    </AppSheet>
  );
});
