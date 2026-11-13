// Ecranul de bun venit (pornit de la WelcomeScreen.js), legat la navigare și tradus în română.
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Logo from '../../components/Logo';
import PrimaryButton from '../../components/PrimaryButton';
import { colors, spacing, font } from '../../constants/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Pentru logo-ul tău din Figma: pune MedlyImage.png în /assets și înlocuiește <Logo /> cu
            <Image source={require('../../../assets/MedlyImage.png')} style={styles.logo} resizeMode="contain" /> */}
        <View style={styles.logoWrap}>
          <Logo />
        </View>

        <Text style={styles.title}>Să începem!</Text>
        <Text style={styles.subtitle}>
          Autentifică-te ca să-ți vezi tratamentul,{'\n'}analizele și programările, și rămâi sănătos!
        </Text>

        <View style={styles.buttons}>
          <PrimaryButton title="Autentificare" onPress={() => router.push('/login')} />
          <PrimaryButton title="Creează cont" variant="outline" onPress={() => router.push('/register')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logoWrap: { marginBottom: spacing.lg },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text, marginBottom: 10 },
  subtitle: {
    fontSize: font.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 23,
  },
  buttons: { width: '100%', gap: 15 },
});
