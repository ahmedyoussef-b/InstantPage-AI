# Classification et Codes Couleurs des Alarmes
Standard visuel pour l'identification de la sévérité des événements sur les écrans HMI.

| Couleur | Signification | Priorité | Action Requise |
|---------|---------------|----------|----------------|
| **Rouge Clignotant** | Déclenchement (Trip) | Critique (1) | Analyse immédiate cause arrêt, mise en sécurité |
| **Rouge Fixe** | Alarme Haute / Danger | Haute (2) | Action corrective urgente pour éviter le trip |
| **Jaune / Orange** | Avertissement / Seuil | Moyenne (3) | Surveillance accrue, ajustement des paramètres |
| **Bleu / Cyan** | Défaut Capteur / Maintenance | Basse (4) | Planifier intervention instrumentation |
| **Blanc / Gris** | Information / Changement d'état | Info (5) | Simple notification de séquence |

## Règles de Priorité
Une alarme de priorité 1 (Trip) doit être traitée avant toute autre action. Le Chef de Quart valide l'acquittement des alarmes de priorité 1 et 2.