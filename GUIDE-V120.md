# ASB V120
Base V119. Conserver les variables Vercel existantes, notamment ASB_CREDENTIALS_KEY. Ne pas changer cette clé.
1. Sauvegarder la base et conserver V119. Tester sur une copie de Supabase.
2. Exécuter uniquement supabase/schema-v120.sql dans SQL Editor. Migration transactionnelle, sans suppression des données existantes.
3. Publier les fichiers V120 sur GitHub et attendre le déploiement Vercel.
4. Tester administrateur : modifier/supprimer une demande, modifier/supprimer une prestation terminée, annuler sa validation, envoyer un message à un ou plusieurs salariés.
5. Tester deux comptes salariés : chacun voit ses messages, confirme la lecture, modifie/supprime seulement ses demandes en attente, valide ses prestations sans pouvoir les décocher ni les éditer. Vérifier que les accès directs aux tables et RPC refusent les opérations interdites.
6. Vérifier le suivi de lecture administrateur et la navigation mobile.
Messages : envoi descendant, sélection individuelle ou multiple ou tous les salariés actifs. Lecture confirmée explicitement, actualisation toutes les 15 secondes environ, pas de notification push. Matériel : désignation, quantités et commentaire restent dans un champ texte comme en V119. Suppression définitive après confirmation.
Contrôles réalisés : analyse syntaxique TSX des fichiers modifiés. Compilation complète, SQL réel, tests de permissions et tests fonctionnels non exécutés dans cet environnement. Ne pas considérer cette version comme auditée.
