# Medly

Aplicație mobilă (Expo + React Native + Firebase, JavaScript) care conectează pacienții și medicii.

## Pornire

```bash
npm install
npx expo start
```
Scanezi codul QR cu **Expo Go** pe telefon, sau apeși `w` pentru browser.

Fără fișier `.env`, aplicația pornește în **modul demo**, cu conturile:
- Pacient: `pacient@demo.ro` / `demo1234`
- Medic: `medic@demo.ro` / `demo1234`

## Conectare la Firebase

1. Creează un proiect în Firebase Console. La Firestore alege o **regiune din UE** (ex. `eur3`), pentru că nu se mai poate schimba ulterior.
2. Activează **Authentication → Email/Password**.
3. Adaugă o aplicație Web și copiază configul în `.env` (pornind de la `.env.example`).
4. Publică regulile din `firestore.rules`.
5. Pentru un medic de test: creează utilizatorul în Authentication, apoi în Firestore adaugă
   documentul `users/{uid}` cu `{ role: "doctor", status: "verified", name: "Dr. ..." }`.
   Pentru pacient: `{ role: "patient", name: "..." }`.

## Structură

```
src/
  app/
    _layout.js          # AuthProvider + redirecționare pe rol (Stack.Protected)
    (auth)/login.js     # ecranul de autentificare
    (auth)/register.js  # următorul ecran de construit
    (patient)/index.js  # home pacient (placeholder)
    (doctor)/index.js   # home medic (placeholder)
  context/AuthContext.js
  lib/firebase.js, authErrors.js
  components/           # TextField, PrimaryButton, Logo
  constants/theme.js    # culori, spațieri, fonturi
firestore.rules
```

## Cum funcționează redirecționarea

Rolul **nu** se deduce din email. După login, aplicația citește `users/{uid}.role`, iar
`Stack.Protected` din `_layout.js` lasă accesibil doar grupul de ecrane al rolului respectiv.
Regulile Firestore împiedică utilizatorul să-și schimbe singur rolul, iar medicii cu
`status` diferit de `"verified"` nu pot intra în aplicație.
