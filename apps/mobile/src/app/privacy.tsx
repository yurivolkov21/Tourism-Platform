import { Stack } from 'expo-router';

import { privacyDoc } from '@tourism/core';
import { messages } from '@tourism/i18n';
import { LegalDocument, Screen } from '@tourism/mobile-ui';

export default function PrivacyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: privacyDoc.title, headerShown: true }} />
      <Screen largeTitle={false}>
        <LegalDocument
          doc={privacyDoc}
          updatedPrefix={messages.mobile.legal.updatedPrefix}
        />
      </Screen>
    </>
  );
}
