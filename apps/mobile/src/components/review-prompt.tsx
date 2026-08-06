import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@tourism/core';
import { messages } from '@tourism/i18n';
import {
  AppText,
  Button,
  RatingInput,
  TextField,
  useTheme,
} from '@tourism/mobile-ui';
import type { BookingVm } from '../lib/booking';
import {
  createReview,
  validateReviewFields,
  type ReviewFieldErrors,
} from '../lib/reviews';

const t = messages.reviews;

type Status = 'idle' | 'submitting' | 'success' | 'alreadyReviewed';

/** "Rate this trip" — offered on any PAID booking (mirrors web's `ReviewPrompt`).
 * `booking.hasReview` tells us upfront whether the caller already reviewed it, so
 * the form never even renders in that case; the 409 `REVIEW_ALREADY_EXISTS` path
 * stays as a race backstop (e.g. two devices submitting at once). */
export function ReviewPrompt({ booking }: { booking: BookingVm }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<Status>(
    booking.hasReview ? 'alreadyReviewed' : 'idle',
  );
  const [fieldErrors, setFieldErrors] = useState<ReviewFieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);

  const submitM = useMutation({
    mutationFn: () =>
      createReview({ bookingCode: booking.code, rating, title, body }),
    onSuccess: () => {
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.code] });
    },
    onError: (error) => {
      setStatus('idle');
      if (
        error instanceof ApiRequestError &&
        error.code === 'REVIEW_ALREADY_EXISTS'
      ) {
        setStatus('alreadyReviewed');
        return;
      }
      const code = error instanceof ApiRequestError ? error.code : undefined;
      setBanner(
        (code && (t.errors as Record<string, string>)[code]) ??
          t.errors.generic,
      );
    },
  });

  function handleSubmit() {
    const invalid = validateReviewFields({ rating, title, body });
    setFieldErrors(invalid);
    if (Object.keys(invalid).length > 0) return;
    setBanner(null);
    setStatus('submitting');
    submitM.mutate();
  }

  if (status === 'success') {
    return (
      <View
        style={{ gap: theme.spacing(1) }}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
      >
        <AppText
          variant="body"
          style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {t.successTitle}
        </AppText>
        <AppText variant="caption" muted>
          {t.successBody}
        </AppText>
      </View>
    );
  }

  if (status === 'alreadyReviewed') {
    return (
      <View
        style={{ gap: theme.spacing(1) }}
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
      >
        <AppText
          variant="body"
          style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
        >
          {t.alreadyReviewedTitle}
        </AppText>
        <AppText variant="caption" muted>
          {t.alreadyReviewedBody}
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing(3) }}>
      <AppText
        variant="body"
        style={{ fontFamily: theme.fontFamilies.sansSemiBold }}
      >
        {t.heading}
      </AppText>
      <View style={{ gap: theme.spacing(1) }}>
        <AppText variant="caption" muted>
          {t.ratingLabel}
        </AppText>
        <RatingInput
          value={rating}
          onChange={setRating}
          error={Boolean(fieldErrors.rating)}
        />
        {fieldErrors.rating ? (
          <AppText
            variant="caption"
            style={{ color: theme.colors['destructive'] }}
          >
            {messages.fieldErrors.rating[fieldErrors.rating]}
          </AppText>
        ) : null}
      </View>
      <TextField
        testID="review-title"
        label={t.titleLabel}
        placeholder={t.titlePlaceholder}
        value={title}
        onChangeText={setTitle}
        error={
          fieldErrors.title
            ? messages.fieldErrors.title[fieldErrors.title]
            : undefined
        }
      />
      <TextField
        testID="review-body"
        label={t.bodyLabel}
        placeholder={t.bodyPlaceholder}
        value={body}
        onChangeText={setBody}
        multiline
        error={
          fieldErrors.body
            ? messages.fieldErrors.body[fieldErrors.body]
            : undefined
        }
      />
      {banner ? (
        <AppText variant="body" style={{ color: theme.colors['destructive'] }}>
          {banner}
        </AppText>
      ) : null}
      <Button
        testID="submit-review"
        label={status === 'submitting' ? t.submitting : t.submit}
        loading={status === 'submitting'}
        onPress={handleSubmit}
      />
    </View>
  );
}

export default ReviewPrompt;
