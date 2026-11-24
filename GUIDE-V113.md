# ASB V113 — Installation et accès

**Tester sur une copie Supabase avant production.** Sauvegarder la base et conserver V112. La migration modifie les politiques RLS de toutes les tables publiques : elle suppose une base dédiée à ASB. Vérifier les autres comptes administrateurs et intégrations avant exécution. Le compte administrateur initial est contact.asb13@gmail.com (vu sur la capture). Adapter cette adresse dans le SQL si nécessaire. Ne pas publier de clé service_role.

1. Dans Supabase > SQL Editor, exécuter `supabase/schema-v113.sql` sur la copie. Vérifier que le compte administrateur existe déjà dans Authentication.
2. Déployer le ZIP sur GitHub/Vercel avec les variables publiques habituelles. La V113 exige la migration. La V112 ne doit plus être utilisée pour créer des comptes salariés.
3. Tester l'administrateur : Gestion, Chantiers, planning existant, création d'une intervention à deux salariés, tâches individuelles et collectives, modification et suppression. Tester les liens et calculs existants.
4. Dans Supabase > Authentication > Users > Add user, créer un utilisateur avec son email et un mot de passe temporaire fort, ou l'inviter selon la configuration du projet. Désactiver les inscriptions publiques si inutiles. Dans ASB > Paramètres > Gestion des accès salariés, saisir cet email, choisir la fiche et associer. Ne jamais partager le compte administrateur.
5. Tester avec deux comptes salariés distincts en navigation privée : chacun voit uniquement ses affectations et ses tâches individuelles, et les tâches collectives communes. Cocher une tâche collective et vérifier sur l'autre compte (actualisation toutes les 15 secondes). Tester la désactivation. Pour réinitialiser un mot de passe, utiliser Authentication dans Supabase.
6. Sur iPhone, ouvrir le site dans Safari > Partager > Sur l'écran d'accueil. Sur Android, Chrome > menu > Ajouter à l'écran d'accueil. Se connecter avec le compte individuel.

## Limites et contrôles avant mise en service
- La création du compte Auth et la réinitialisation restent dans Supabase. L'association et la désactivation sont dans ASB.
- Chantiers et Magasinier salariés : consultation des chantiers attribués et des besoins matériels, pas les écrans administrateur ni leurs opérations d'achat.
- Les anciennes lignes restent intactes et n'ont pas de prestations jusqu'à modification. Les prestations sont liées à un groupe d'intervention, non aux devis. Les opérations d'enregistrement du planning et des tâches sont séparées : vérifier en cas d'erreur avant de réessayer.
- Les fichiers des buckets historiquement publics restent accessibles par URL publique. Auditer les documents, vues et fonctions SQL historiques avant d'ouvrir des accès réels. La migration ne constitue pas un audit de sécurité complet.
- Vérification syntaxique TypeScript uniquement ; compilation Vercel, migration et tests fonctionnels non exécutés ici.
