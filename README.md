# ASB Intranet Cloud

Repo prévu : https://github.com/asb-intranet/nimes.git

## 1. Supabase

Dans Supabase > SQL Editor, colle et lance :

`supabase/schema.sql`

Puis crée un utilisateur dans :
Authentication > Users > Add user

## 2. Variables d'environnement

Créer un fichier `.env.local` depuis `.env.local.example`.

## 3. Tester en local

```bash
npm install
npm run dev
```

Ouvrir : http://localhost:3000

## 4. Envoyer sur GitHub

```bash
git init
git add .
git commit -m "Initial ASB intranet cloud"
git branch -M main
git remote add origin https://github.com/asb-intranet/nimes.git
git push -u origin main
```

## 5. Déployer sur Vercel

Import GitHub repo > choisir asb-intranet/nimes > ajouter les variables :
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Modules inclus

- Tableau de bord
- Gestion chantiers
- Upload photos chantier réel
- Upload PDF / documents réel
- Paiements clients / échéanciers avec document lié
- Planning
- Pointage personnel
- Gestion véhicules
- Application mobile installable PWA
- Demandes internes
- Base comptes utilisateurs Supabase Auth
