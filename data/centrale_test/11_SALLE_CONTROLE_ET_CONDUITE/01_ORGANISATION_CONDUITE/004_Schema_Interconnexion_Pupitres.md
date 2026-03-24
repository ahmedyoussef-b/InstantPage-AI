# Schéma d'Interconnexion des Pupitres
Description des liens logiques et flux de données entre les postes de conduite.

## Couplages Logiques
- **Bloc 1** : Interconnexion directe TG1 ↔ CR1. Les paramètres de combustion influent sur la production de vapeur.
- **Bloc 2** : Interconnexion directe TG2 ↔ CR2.
- **Collecteur Vapeur** : Flux CR1 + CR2 → Turbine à Vapeur (TV). Une régulation de pression commune assure la stabilité de l'admission TV.

## Réseau de Contrôle
Tous les pupitres communiquent via le bus de contrôle redondant ABB Symphony Plus. Les alarmes critiques sont répliquées sur le poste du Chef de Quart.