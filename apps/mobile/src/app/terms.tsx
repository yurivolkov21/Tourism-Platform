import { Stack } from 'expo-router';

import { termsDoc } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { LegalDocument, Screen } from '@tourism/mobile-ui';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: termsDoc.title, headerShown: true }} />
      <Screen largeTitle={false}>
        <LegalDocument
          doc={termsDoc}
          updatedPrefix={messages.mobile.legal.updatedPrefix}
        />
      </Screen>
    </>
  );
}
