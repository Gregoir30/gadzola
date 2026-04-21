-- Vide les tables métier (ordre dépendances)
DELETE FROM public.notifications;
DELETE FROM public.transactions;
DELETE FROM public.clients;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;

-- Supprime tous les comptes auth (ce qui supprimera les éventuels restes via cascade)
DELETE FROM auth.users;