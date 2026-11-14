# Medly

Aplicație mobilă (Expo + React Native + Firebase, JavaScript) care conectează pacienții și medicii.

## Pornire

```bash
npm install
npx expo start
```
Scanezi codul QR cu **Expo Go** pe telefon, sau apeși `w` pentru browser.

Fără fișier `.env`, aplicația pornește în **modul demo**, cu conturile:
- Pacient: `pacient@demo.ro` / `p1234`
- Medic: `medic@demo.ro` / `m1234`

CNP-uri fictive, valide ca format, pentru teste la înregistrare: `1970523350012`, `2951111350021`.


## Fluxul de consimțământ

1. Medicul → „Adaugă pacient” → introduce CNP-ul → „Trimite cererea de acces”.
   Înainte de acceptare medicul vede doar `CNP •••• 0012`, fără nume sau alte date.
2. Pacientul vede cererea pe ecranul principal → Accept / Refuz.
3. După acceptare, pacientul apare instant în lista medicului (nume, vârstă).
4. Pacientul poate retrage oricând accesul din „Medicii mei”.

5. În fișa pacientului, medicul adaugă medicamente (ore, durată, instrucțiuni).
6. Pacientul le vede în „Ce iau azi” și bifează „Luat”; medicul vede live „Azi: 1/3 luate”.

Regulile din `firestore.rules` impun aceste reguli și pe server, nu doar în interfață.

## Structură

```
src/
  app/
    _layout.js                    # AuthProvider + redirecționare pe rol (Stack.Protected)
    (auth)/login.js, register.js  # autentificare, înregistrare pacient (CNP validat + hash)
    (patient)/(tabs)/index.js     # Acasă: cereri de acces, următoarea programare, „Ce iau azi”, medicii mei
    (patient)/(tabs)/appointments.js  # programările pacientului
    (patient)/(tabs)/labs.js      # analizele pacientului
    (patient)/book.js             # programare nouă (medic → zi → oră → motiv)
    (patient)/lab/[labId].js      # detaliu analize
    (doctor)/(tabs)/index.js      # Azi: programările zilei și următoarele
    (doctor)/(tabs)/patients.js   # lista de pacienți (activi / în așteptare / fără acces)
    (doctor)/add-patient.js       # căutare după CNP + cerere de acces
    (doctor)/patient/[id]/index.js        # fișa pacientului: tratament, aderență, analize
    (doctor)/patient/[id]/lab/[labId].js  # detaliu analize
    (doctor)/add-medication.js, add-lab.js
  lib/          # firebase, auth, cnp, careLinks, medications, labs, appointments, reminders, demoStore
  components/   # UI refolosibil (TextField, Chip, Card, TodayMeds, LabViews, AppointmentCard…)
firestore.rules
storage.rules   # doar pentru atașarea de PDF (Firebase Storage → planul Blaze)
```

## Funcționalități

- **Consimțământ:** medicul cere acces după CNP; pacientul acceptă / refuză / retrage.
- **Tratament:** medicul adaugă medicamente (ore, durată, instrucțiuni); pacientul bifează dozele în
  „Ce iau azi”, iar medicul vede aderența în timp real.
- **Remindere:** notificări locale zilnice la orele medicamentelor (doar pe telefon; merg și în Expo Go).
  Din „Ce iau azi” → comutatorul „Remindere” → „Trimite un reminder de test”.
- **Analize:** valori structurate cu valori de referință; cele din afara limitelor sunt evidențiate automat.
  PDF-ul buletinului e opțional: necesită Firebase Storage (planul Blaze), `EXPO_PUBLIC_ENABLE_PDF_UPLOAD=true`
  în `.env` și regulile din `storage.rules`.
- **Programări:** program implicit Luni–Vineri 09:00–13:00, sloturi de 30 min. Pacientul alege dintre
  „Medicii mei” sau caută în director după **spital și specializare**. Aceeași oră nu poate fi rezervată de doi
  pacienți. Medicul vede programările pe zile (30 de zile înainte) sau ca listă completă, iar pentru un pacient
  nou poate trimite cerere de acces la dosar direct din programare.
- **Administrare medici:** medicii se înscriu din „Creează cont → Sunteți medic?” (parafă, specializare,
  spital) și rămân *în verificare*. Adminul îi aprobă / respinge din tabul „Cereri”, poate adăuga direct un
  medic (primește email de setare a parolei) și poate dezactiva conturi din tabul „Medici”.
- **Bun venit + Profil:** ecran de start (Autentificare / Creează cont) și tab „Profil” pentru pacient și medic.

## Cum funcționează redirecționarea

Rolul **nu** se deduce din email. După login, aplicația citește `users/{uid}.role`, iar
`Stack.Protected` din `_layout.js` lasă accesibil doar grupul de ecrane al rolului respectiv.
Regulile Firestore împiedică utilizatorul să-și schimbe singur rolul, iar medicii cu
`status` diferit de `"verified"` nu pot intra în aplicație.
