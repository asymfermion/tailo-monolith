import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
} from '@expo-google-fonts/lora';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from '@expo-google-fonts/nunito';
import {
  Playfair_400Regular,
  Playfair_500Medium,
  Playfair_600SemiBold,
  Playfair_700Bold,
} from '@expo-google-fonts/playfair';
import { useFonts } from 'expo-font';

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Lora_700Bold,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Playfair_400Regular,
    Playfair_500Medium,
    Playfair_600SemiBold,
    Playfair_700Bold,
  });

  return loaded;
}
