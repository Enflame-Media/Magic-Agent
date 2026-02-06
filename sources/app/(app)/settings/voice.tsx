import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';
import { ItemList } from '@/components/ItemList';
import { Switch } from '@/components/Switch';
import { useSettingMutable } from '@/sync/storage';
import { findLanguageByCode, getLanguageDisplayName, LANGUAGES } from '@/constants/Languages';
import { t } from '@/text';

function VoiceSettingsScreen() {
    const router = useRouter();
    const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useSettingMutable('voiceAssistantEnabled');
    const [voiceAssistantLanguage] = useSettingMutable('voiceAssistantLanguage');

    // Find current language or default to first option
    const currentLanguage = findLanguageByCode(voiceAssistantLanguage) || LANGUAGES[0];

    return (
        <ItemList style={{ paddingTop: 0 }}>
            {/* Voice Assistant Enable/Disable */}
            <ItemGroup
                title={t('settingsVoice.voiceAssistantTitle')}
                footer={t('settingsVoice.voiceAssistantDescription')}
            >
                <Item
                    title={t('settingsVoice.enableVoiceAssistant')}
                    subtitle={voiceAssistantEnabled ? t('settingsVoice.voiceAssistantEnabledSubtitle') : t('settingsVoice.voiceAssistantDisabledSubtitle')}
                    icon={<Ionicons name="mic-outline" size={29} color="#5856D6" />}
                    rightElement={
                        <Switch
                            value={voiceAssistantEnabled}
                            onValueChange={setVoiceAssistantEnabled}
                        />
                    }
                    showChevron={false}
                />
            </ItemGroup>

            {/* Language Settings */}
            <ItemGroup
                title={t('settingsVoice.languageTitle')}
                footer={t('settingsVoice.languageDescription')}
            >
                <Item
                    title={t('settingsVoice.preferredLanguage')}
                    subtitle={t('settingsVoice.preferredLanguageSubtitle')}
                    icon={<Ionicons name="language-outline" size={29} color="#007AFF" />}
                    detail={getLanguageDisplayName(currentLanguage)}
                    onPress={() => router.push('/settings/voice/language')}
                />
            </ItemGroup>

        </ItemList>
    );
}

export default React.memo(VoiceSettingsScreen);
