# Programme de fidelite Flam's

Base de cadrage pour une application web de fidelite franchise Flam's avec carte digitale a tampons, utilisable en restaurant et integrable dans Apple Wallet / Google Wallet.

## Objectif

Permettre aux clients Flam's de posseder une carte de fidelite digitale, de la presenter en restaurant via un QR code ou depuis leur Wallet, et permettre aux equipes en point de vente d'ajouter un tampon apres un achat sans integration caisse.

## MVP

### Client

- Creation d'une carte de fidelite depuis un formulaire client.
- Creation d'un mot de passe client.
- Connexion client par email et mot de passe.
- Carte digitale avec :
  - nom / prenom,
  - restaurant favori ou restaurant d'inscription,
  - nombre de tampons,
  - recompense disponible,
  - QR code unique.
- Boutons :
  - ajouter a Apple Wallet,
  - ajouter a Google Wallet.
- Historique simple :
  - date,
  - restaurant,
  - tampon ajoute,
  - recompense utilisee.

### Restaurant

- Connexion equipe.
- Scan du QR code client ou recherche par telephone/email.
- Affichage de la carte client.
- Ajout d'un tampon apres achat.
- Utilisation d'une recompense quand la carte est complete.
- Historique des actions du restaurant.

### Franchise / siege

- Gestion des restaurants.
- Gestion des utilisateurs equipe.
- Configuration du programme :
  - nombre de tampons requis,
  - recompense,
  - validite eventuelle,
  - restaurants participants.
- Vue statistiques :
  - cartes creees,
  - tampons distribues,
  - recompenses utilisees,
  - activite par restaurant.

## Regle de fidelite proposee

Version simple pour le lancement :

- 1 achat en restaurant = 1 tampon.
- 4 tampons = 5% de remise.
- 7 tampons = 10% de remise.
- 10 tampons = 20% de remise.
- Chaque avantage peut etre marque comme utilise par l'equipe.
- Apres utilisation du palier final de 20%, une nouvelle carte repart a 0 tampon.

La recompense exacte reste a definir par Flam's : flammekueche offerte, dessert offert, boisson offerte, remise, menu, etc.

## Parcours client

1. Le client scanne un QR code affiche en restaurant.
2. Il cree sa carte en moins d'une minute.
3. Il peut l'ajouter a Apple Wallet ou Google Wallet.
4. A chaque achat, il montre sa carte digitale.
5. L'equipe scanne la carte et ajoute un tampon.
6. Quand la carte est complete, l'equipe valide l'utilisation de la recompense.

## Parcours equipe restaurant

1. L'equipe se connecte a l'interface web.
2. Elle choisit son restaurant si l'utilisateur a acces a plusieurs sites.
3. Elle scanne le QR code de la carte client.
4. Elle voit l'etat de la carte.
5. Elle clique sur "Ajouter un tampon" ou "Utiliser la recompense".
6. L'action est journalisee avec l'utilisateur, le restaurant et l'heure.

## Roles

- Client : consulte sa carte et son historique.
- Employe restaurant : ajoute des tampons et utilise les recompenses.
- Manager restaurant : voit les statistiques de son restaurant et gere les employes locaux.
- Admin franchise : gere les restaurants, utilisateurs, regles et statistiques globales.

## Donnees principales

### Restaurant

- id
- nom
- ville
- adresse
- statut actif / inactif

### Client

- id
- prenom
- nom
- email
- telephone
- consentement marketing
- date de creation

### Carte de fidelite

- id
- client_id
- numero unique
- restaurant_creation_id
- statut active / recompense_disponible / archivee
- nombre_tampons
- date de creation
- date de derniere activite

### Transaction fidelite

- id
- carte_id
- restaurant_id
- utilisateur_id
- type tampon_ajoute / recompense_utilisee / correction
- commentaire optionnel
- date

### Utilisateur equipe

- id
- nom
- email
- role
- restaurants autorises

## Wallet

### Apple Wallet

Apple Wallet necessite :

- un compte Apple Developer,
- un Pass Type ID,
- un certificat de signature,
- un fichier `.pkpass` genere par le backend.

La carte Apple Wallet peut contenir :

- le nom Flam's,
- le nombre de tampons,
- la recompense,
- un QR code contenant l'identifiant unique de carte,
- une couleur et un logo Flam's.

### Google Wallet

Google Wallet necessite :

- un compte Google Cloud,
- l'API Google Wallet activee,
- un issuer account,
- une classe de pass,
- des objets de pass par client.

La carte Google Wallet peut etre mise a jour quand un tampon est ajoute.

## Stack technique recommandee

### Premiere version

- Next.js pour l'application web client, restaurant et admin.
- PostgreSQL pour les donnees.
- Prisma pour le modele de donnees.
- Auth.js ou Clerk pour l'authentification.
- API backend integree a Next.js.
- QR codes generes cote backend.
- Design responsive pour usage mobile en restaurant.

### Mobile

Ne pas commencer par une app mobile native.

Priorite :

1. Web app responsive.
2. Ajout Wallet.
3. PWA installable si besoin.
4. Application mobile native seulement si les usages le justifient.

## Ecrans a construire en premier

1. `index.html` : creation de compte client et connexion.
2. `carte.html` : carte digitale client apres connexion.
3. `restaurant.html` : recherche, tamponnage et recompense.
4. `admin.html` : statistiques, restaurants, clients et export CSV.

## Assets de marque

Les visuels Flam's peuvent etre ajoutes dans :

`assets/brand/`

Ce dossier est prevu pour les logos, SVG, PNG, fonds de carte, motifs, icones ou photos qui seront ensuite integres dans l'application.

## Etat technique V1

La V1 actuelle est volontairement simple :

- application web statique,
- donnees stockees dans le navigateur via `localStorage`,
- session client stockee via `sessionStorage`,
- mot de passe encode pour demo uniquement.

Ce fonctionnement permet de tester rapidement le parcours produit, mais ne doit pas etre utilise tel quel en production.

## Prochaine etape production

Pour rendre l'application reelle, il faudra ajouter :

- une base de donnees PostgreSQL,
- une authentification serveur securisee,
- un hachage de mot de passe avec `bcrypt` ou equivalent,
- une API backend,
- une synchro Brevo,
- la generation Apple Wallet / Google Wallet cote serveur.

Stack conseillee pour la suite :

- Next.js,
- PostgreSQL,
- Prisma,
- Auth.js ou Clerk,
- Vercel pour l'hebergement.

## Points de vigilance

- Eviter les abus : limiter le nombre de tampons ajoutables par carte et par employe sur une courte periode.
- Journaliser toutes les actions equipe.
- Prevoir une correction manuelle par manager.
- Verifier le consentement RGPD pour toute communication marketing.
- Ne pas stocker de donnees sensibles inutiles.
- Gerer les restaurants franchises avec des droits separes.

## Decisions ouvertes

- Nombre exact de tampons requis.
- Recompense offerte.
- Validite de la carte ou des tampons.
- Possibilite d'une carte valable dans tous les restaurants Flam's ou seulement certains.
- Authentification client par email, telephone, ou magic link.
- Niveau de personnalisation par restaurant franchise.
