# Lingva Translation Support

This RPG Maker MV/MZ Cheat UI Plugin now includes support for **Lingva Translate**, a free and open-source alternative front-end for Google Translate. This feature is particularly useful for games with variable names in Chinese, Japanese, Korean, or other non-English languages.

## What is Lingva Translate?

Lingva Translate is a privacy-focused translation service that provides Google Translate functionality without tracking. It supports over 100 languages and offers a public API that we use for translating variable names in the cheat interface.

## Features

- **Auto-detection**: Automatically detects the source language and translates to English
- **Specific language pairs**: Support for Japanese→English, Chinese→English, and Korean→English
- **Bulk translation**: Efficiently translates multiple variable names at once
- **No setup required**: Uses the public Lingva instance at https://lingva.ml
- **Privacy-focused**: No tracking or data collection

## Available Translation Options

The plugin now includes the following Lingva translation endpoints:

1. **Lingva Translate (Auto → EN)** - Automatically detects source language (lingva.ml)
2. **Lingva Translate (JA → EN)** - Japanese to English (lingva.ml)
3. **Lingva Translate (Auto → EN) [Chinese]** - Auto-detect optimized for Chinese (lingva.ml)
4. **Lingva Translate (Plausibility)** - Alternative instance (translate.plausibility.cloud)

## How to Use

1. **Open the Cheat UI** in your RPG Maker game
2. **Navigate to Translation Settings** panel
3. **Enable Translation** by toggling the "Enable" switch
4. **Select a Lingva endpoint** from the "End Point" radio buttons
5. **Enable Variable Translation** by checking "Translate Variables"
6. **Go to the Variable Settings** panel to see translated variable names

## Configuration

### Recommended Settings

- **Chunk Size**: 5 (recommended for Lingva endpoints to avoid rate limiting)
- **Endpoint**: Choose based on your game's primary language:
  - Use "Auto → EN" for mixed languages or general use
  - Use "JA → EN" specifically for Japanese games
  - Use "Auto → EN [Chinese]" for Chinese games
  - Use "Plausibility" as an alternative if main instance is slow

### Translation Targets

You can enable/disable translation for different game elements:
- ✅ **Variables** - Translate variable names (recommended)
- ✅ **Switches** - Translate switch names
- ✅ **Maps** - Translate map names
- ❌ **Items** - Currently disabled (can be enabled if needed)

## Example Usage

### Before Translation (Japanese variables):
```
プレイヤー名: "Hero"
レベル: 15
経験値: 2500
ゴールド: 1000
```

### After Translation:
```
Player Name: "Hero"
Level: 15
Experience: 2500
Gold: 1000
```

## Technical Details

- **Primary API**: https://lingva.ml/api/v1/{source}/{target}/{text}
- **Alternative API**: https://translate.plausibility.cloud/api/v1/{source}/{target}/{text}
- **Method**: GET (direct API calls, no proxy needed)
- **Response Format**: JSON with `translation` field
- **Rate Limiting**: 200ms delays between requests to respect the public service
- **Encoding**: Uses encodeURIComponent for proper URL encoding
- **Fallback**: If translation fails, original text is displayed

## Troubleshooting

### Translation Not Working
1. Check your internet connection
2. Verify that "Enable" is turned on in Translation Settings
3. Ensure "Translate Variables" is checked
4. Try a different Lingva endpoint
5. Reduce the chunk size if you're getting errors

### Slow Translation
- Reduce the chunk size in settings
- Use specific language endpoints instead of auto-detection
- Check your internet connection speed

### Partial Translation
- Some variable names might be empty or contain special characters
- The plugin will skip empty variables and preserve the original text for untranslatable content

## Privacy and Terms

- Lingva Translate is a privacy-focused service that doesn't track users
- Translation requests are sent to the public Lingva instance
- No personal data is collected or stored
- Please respect the public service and avoid excessive requests

## Credits

- **Lingva Translate**: https://github.com/thedaviddelta/lingva-translate
- **Public Instance**: https://lingva.ml
- **RPG Maker Cheat Plugin**: Enhanced with Lingva support

## Support

If you encounter issues with the Lingva translation feature:
1. Test the translation using the included test file (`test-lingva.html`)
2. Check the browser console for error messages
3. Try different Lingva endpoints
4. Report issues with specific error messages and game details
