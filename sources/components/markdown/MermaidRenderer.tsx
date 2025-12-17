import * as React from 'react';
import { View, Platform, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';

/**
 * MermaidRenderer - Renders Mermaid diagrams securely across all platforms.
 *
 * Security: Uses sandboxed WebView/iframe to render mermaid content,
 * preventing any XSS vulnerabilities from user-provided diagram syntax.
 */
export const MermaidRenderer = React.memo((props: {
    content: string;
}) => {
    const { theme } = useUnistyles();
    const [dimensions, setDimensions] = React.useState({ width: 0, height: 200 });
    const [hasError, setHasError] = React.useState(false);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const onLayout = React.useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
        const { width } = event.nativeEvent.layout;
        setDimensions(prev => ({ ...prev, width }));
    }, []);

    // Generate the HTML content for mermaid rendering
    // Content is HTML-escaped to prevent injection
    const escapedContent = props.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    padding: 16px;
                    background-color: ${theme.colors.surfaceHighest};
                    min-height: 100px;
                }
                #mermaid-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 100%;
                }
                .mermaid {
                    text-align: center;
                    width: 100%;
                }
                .mermaid svg {
                    max-width: 100%;
                    height: auto;
                }
                .error {
                    color: #ff6b6b;
                    font-family: monospace;
                    padding: 16px;
                    background: rgba(255,0,0,0.1);
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div id="mermaid-container" class="mermaid">
                ${escapedContent}
            </div>
            <script>
                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'dark',
                    securityLevel: 'strict'
                });

                // Report height changes to parent
                function reportHeight() {
                    const height = document.body.scrollHeight;
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dimensions', height }));
                    } else if (window.parent !== window) {
                        window.parent.postMessage({ type: 'mermaid-height', height }, '*');
                    }
                }

                // Report after mermaid renders
                mermaid.run().then(reportHeight).catch(function(err) {
                    document.getElementById('mermaid-container').innerHTML =
                        '<div class="error">Diagram error: ' + err.message + '</div>';
                    reportHeight();
                });
            </script>
        </body>
        </html>
    `;

    // Handle messages from iframe (web only)
    React.useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'mermaid-height' && typeof event.data.height === 'number') {
                setDimensions(prev => ({
                    ...prev,
                    height: Math.max(100, event.data.height + 32) // Add padding
                }));
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Web platform uses sandboxed iframe
    if (Platform.OS === 'web') {
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

        return (
            <View style={style.container}>
                {/* @ts-ignore - Web only iframe element */}
                <iframe
                    ref={iframeRef}
                    src={dataUrl}
                    sandbox="allow-scripts"
                    style={{
                        width: '100%',
                        height: dimensions.height,
                        border: 'none',
                        borderRadius: 8,
                        backgroundColor: theme.colors.surfaceHighest,
                    }}
                    title="Mermaid Diagram"
                />
            </View>
        );
    }

    // For iOS/Android, use WebView (inherently sandboxed)
    return (
        <View style={style.container} onLayout={onLayout}>
            <View style={[style.innerContainer, { height: dimensions.height }]}>
                <WebView
                    source={{ html }}
                    style={{ flex: 1 }}
                    scrollEnabled={false}
                    originWhitelist={['*']}
                    onMessage={(event) => {
                        try {
                            const data = JSON.parse(event.nativeEvent.data);
                            if (data.type === 'dimensions' && typeof data.height === 'number') {
                                setDimensions(prev => ({
                                    ...prev,
                                    height: Math.max(100, data.height + 32)
                                }));
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }}
                    onError={() => setHasError(true)}
                />
            </View>
            {hasError && (
                <View style={style.errorOverlay}>
                    <Text style={style.errorText}>Failed to render diagram</Text>
                </View>
            )}
        </View>
    );
});

const style = StyleSheet.create((theme) => ({
    container: {
        marginVertical: 8,
        width: '100%',
    },
    innerContainer: {
        width: '100%',
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
        overflow: 'hidden',
    },
    errorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceHighest,
        borderRadius: 8,
    },
    errorText: {
        ...Typography.default('semiBold'),
        color: theme.colors.textSecondary,
        fontSize: 14,
    },
}));
