# Code Signing — DevisPro

## Pourquoi signer le code ?

Sans signature, les utilisateurs verront :
- **Windows** : "Windows a protégé votre ordinateur" (SmartScreen)
- **macOS** : "Impossible d'ouvrir car le développeur ne peut pas être vérifié"

## Windows — Certificat EV

### Obtenir le certificat
1. Acheter un **EV Code Signing Certificate** chez :
   - [Sectigo](https://sectigo.com) (~300-500 CHF/an)
   - [DigiCert](https://digicert.com) (~500 CHF/an)
   - [GlobalSign](https://globalsign.com) (~400 CHF/an)

2. Le certificat est livré sur un **token USB physique** (requis pour EV)

### Configuration
Définir ces variables d'environnement avant le build :

```bash
# Méthode 1 : Token USB (EV Certificate)
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your-password

# Méthode 2 : Windows Certificate Store
set WIN_CSC_LINK=path/to/certificate.pfx
set WIN_CSC_KEY_PASSWORD=your-password
```

Puis dans `package.json`, remplacer `"sign": null` par :
```json
"sign": "./scripts/sign-win.js"
```

### Build
```bash
npm run package:win
```

## macOS — Apple Developer

### Obtenir le certificat
1. Inscription au [Apple Developer Program](https://developer.apple.com) (99 USD/an)
2. Dans Xcode > Preferences > Accounts > Manage Certificates
3. Créer un certificat **Developer ID Application**

### Configuration
```bash
# Apple Developer Identity
export CSC_NAME="Developer ID Application: Votre Nom (XXXXXXXXXX)"

# Pour la notarization (obligatoire depuis macOS 10.15)
export APPLE_ID=votre@email.com
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=XXXXXXXXXX
```

Dans `package.json`, remplacer `"identity": null` par votre identité :
```json
"identity": "Developer ID Application: Votre Nom (XXXXXXXXXX)"
```

### Notarization
Ajouter dans package.json > build > mac :
```json
"notarize": {
  "teamId": "XXXXXXXXXX"
}
```

### Build
```bash
npm run package:mac
```

## Budget estimé

| Élément | Coût annuel |
|---------|-------------|
| Apple Developer | ~99 CHF |
| Windows EV Certificate | ~300-500 CHF |
| **Total** | **~400-600 CHF/an** |

## Résumé

1. Acheter les certificats (une fois par an)
2. Configurer les variables d'environnement
3. Mettre à jour les champs `sign`/`identity` dans package.json
4. Lancer `npm run package:win` ou `npm run package:mac`
