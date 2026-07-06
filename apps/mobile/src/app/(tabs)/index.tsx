import { Text, View } from 'react-native';
import { messages } from '@tourism/i18n';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{messages.mobile.home.greeting}</Text>
    </View>
  );
}
