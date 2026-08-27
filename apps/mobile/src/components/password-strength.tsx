import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { messages } from '@tourism/i18n';
import { AppText, useTheme } from '@tourism/mobile-ui';
import { passwordStrengthTone, scorePassword } from '../lib/password-policy';

const rulesCopy = messages.auth.passwordRules;

/**
 * Five bars + a live requirements checklist, mirroring the web `PasswordField`
 * meter. It exists so "your password is too weak" stops being a verdict the
 * user has to decode: every rule is listed, and each one ticks green the moment
 * it is met, so the fix is visible while typing rather than after a rejection.
 *
 * Renders nothing for an empty password — an untouched field shouldn't shout.
 */
export function PasswordStrength({ password }: { password: string }) {
  const theme = useTheme();
  if (password === '') return null;

  const { score, rules } = scorePassword(password);
  const toneColor = theme.colors[passwordStrengthTone(score)];

  return (
    <View style={{ gap: theme.spacing(2), paddingTop: theme.spacing(1) }}>
      <View
        // The bars are decoration for the label + checklist below, which carry
        // the same information as text for screen readers.
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', gap: theme.spacing(1), height: 4 }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: '100%',
              borderRadius: 999,
              backgroundColor: i < score ? toneColor : theme.colors['border'],
            }}
          />
        ))}
      </View>
      <AppText variant="caption" style={{ color: toneColor }}>
        {messages.auth.passwordStrength(score)}
      </AppText>
      <View style={{ gap: theme.spacing(1) }}>
        {rules.map((rule) => (
          <View
            key={rule.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing(2),
            }}
          >
            <Ionicons
              name={rule.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={
                rule.met
                  ? theme.colors['success']
                  : theme.colors['muted-foreground']
              }
            />
            <AppText
              variant="caption"
              style={{
                color: rule.met
                  ? theme.colors['success']
                  : theme.colors['muted-foreground'],
              }}
            >
              {rulesCopy[rule.key]}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
