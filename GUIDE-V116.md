# ASB V116

Accès intranet visible sur chaque fiche salarié. Les actions de compte sont distinctes des actions de fiche. En cas d’erreur, le statut Indisponible et le bouton Réessayer remplacent la vérification permanente.

## Vercel
Settings > Environment Variables : vérifier NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY (clé service_role du même projet Supabase, uniquement côté serveur). Enregistrer pour Production et Preview selon le déploiement, puis Redeploy. Ne jamais publier la clé dans GitHub.

Aucune migration SQL nouvelle si V113 et V114 sont appliquées. Tester en Preview : création, modification email, changement mot de passe, désactivation, réactivation, suppression du compte et conservation de la fiche. Tester avec un compte salarié dédié.
