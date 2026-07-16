# Integration Brevo - preparation V1

La V1 fonctionne sans connexion Brevo. Les donnees clients sont stockees localement dans le navigateur pour valider le parcours metier.

## Donnees a envoyer a Brevo

Lors de la creation d'une carte :

- email
- telephone
- prenom
- nom
- restaurant d'inscription
- numero de carte
- consentement marketing
- date de creation

## Moment d'integration recommande

Ajouter Brevo apres validation des ecrans suivants :

1. creation de carte,
2. affichage carte client,
3. ajout de tampon restaurant,
4. utilisation recompense.

## Point technique cible

Dans la future version backend, creer un service dedie :

```ts
syncCustomerToBrevo(customer, loyaltyCard)
```

Ce service sera appele apres la creation d'une carte. Il ne doit pas bloquer la creation de carte si Brevo est temporairement indisponible.

## Variables d'environnement futures

```txt
BREVO_API_KEY=
BREVO_LIST_ID=
BREVO_BASE_URL=https://api.brevo.com/v3
```

## Regle RGPD

Le contact peut etre cree dans Brevo pour la relation client liee au programme de fidelite. Les communications marketing doivent respecter la valeur du champ `marketingConsent`.

