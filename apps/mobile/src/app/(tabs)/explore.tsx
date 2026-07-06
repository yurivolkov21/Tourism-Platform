import { Text, View } from 'react-native';
import { messages } from '@tourism/i18n';

export default function ExploreScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text>{messages.mobile.placeholders.explore}</Text>
    </View>
  );
}
