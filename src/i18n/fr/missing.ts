/**
 * French for the reasons a figure shows as Missing (src/utils/liveFigures.ts and the helpers it
 * calls), keyed by the exact English text like src/i18n/es/missing.ts. Formal "vous" throughout.
 * Not yet checked by a native speaker.
 */
export const MISSING_FR: Record<string, string> = {
  "Needs setup":
    "À configurer",
  "CDS prices (the market cost of insuring against a government default) are sold by data vendors; no free source publishes them, and the app does not guess. If you have a licence, connect your own CDS under Menu > Settings > Your own paid data (a CSV file or your LSEG account).":
    "Les prix des CDS (ce que coûte sur le marché une assurance contre un défaut de l'État) sont vendus par des fournisseurs de données ; aucune source gratuite ne les publie, et l'application ne les devine pas. Si vous disposez d'une licence, connectez vos propres CDS dans Menu > Réglages > Vos propres données payantes (un fichier CSV ou votre compte LSEG).",
  "BCRP did not answer":
    "La BCRP n'a pas répondu",
  "This spread (the extra interest the government pays on its US dollar bonds over US government bonds) is republished monthly, free, by the central bank of Peru's data service (BCRPData), which did not answer this time. Press Refresh now, or download it for offline use under Menu > Offline data.":
    "Cet écart (les intérêts supplémentaires que l'État paie sur ses obligations en dollars américains par rapport aux obligations de l'État américain) est republié chaque mois, gratuitement, par le service de données de la banque centrale du Pérou (BCRPData), qui n'a pas répondu cette fois-ci. Appuyez sur Actualiser maintenant, ou téléchargez-le pour un usage hors ligne dans Menu > Données hors ligne.",
  "No free source":
    "Pas de source gratuite",
  "No free official source publishes this spread for this country. The spread (the extra interest the government pays on its US dollar bonds over US government bonds) is published free only for eight Latin American countries, by the central bank of Peru: Argentina, Brazil, Chile, Colombia, Ecuador, Mexico, Peru and Venezuela. For other countries it is sold by data vendors, so the app shows Missing.":
    "Aucune source officielle gratuite ne publie cet écart pour ce pays. L'écart (les intérêts supplémentaires que l'État paie sur ses obligations en dollars américains par rapport aux obligations de l'État américain) n'est publié gratuitement que pour huit pays d'Amérique latine, par la banque centrale du Pérou : l'Argentine, le Brésil, le Chili, la Colombie, l'Équateur, le Mexique, le Pérou et le Venezuela. Pour les autres pays, il est vendu par des fournisseurs de données, l'application affiche donc Manquant.",
  "Feed did not answer":
    "Le flux n'a pas répondu",
  "The 10-year government bond yield comes from an official source (FRED, the US Federal Reserve's free data service, which republishes OECD figures), and it did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. A free FRED key under Menu > Settings gives a steadier connection.":
    "Le rendement des obligations d'État à 10 ans provient d'une source officielle (FRED, le service de données gratuit de la Réserve fédérale américaine, qui republie les chiffres de l'OCDE), et celle-ci n'a pas répondu cette fois-ci. C'est généralement temporaire. Appuyez sur Actualiser maintenant dans Recherche > Un pays pour réessayer. Une clé FRED gratuite dans Menu > Réglages offre une connexion plus stable.",
  "Needs EVDS key":
    "Clé EVDS requise",
  "Turkey's 10-year government bond yield comes from EVDS, the central bank of Turkey's free data service, which needs a free key. Add the key and the 10Y series code under Menu > Settings > Data API keys, or in .env.":
    "Le rendement des obligations d'État turques à 10 ans provient d'EVDS, le service de données gratuit de la banque centrale de Turquie, qui exige une clé gratuite. Ajoutez la clé et le code de la série à 10 ans dans Menu > Réglages > Clés d'API de données, ou dans .env.",
  "No source yet":
    "Pas encore de source",
  "No free official source of this country's 10-year government bond yield is connected yet, and the app does not estimate one. If you have the official figures (for example from the central bank or finance ministry website), upload them as a yields file.":
    "Aucune source officielle gratuite du rendement des obligations d'État à 10 ans de ce pays n'est encore connectée, et l'application n'en estime pas. Si vous disposez des chiffres officiels (par exemple sur le site de la banque centrale ou du ministère des Finances), chargez-les comme fichier de rendements.",
  "IMF did not answer":
    "Le FMI n'a pas répondu",
  "This figure comes from the International Monetary Fund's free World Economic Outlook data, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. If it keeps happening, check the internet connection under Menu > Tools > Data connections.":
    "Ce chiffre provient des données gratuites des Perspectives de l'économie mondiale du Fonds monétaire international, qui n'ont pas répondu cette fois-ci. C'est généralement temporaire. Appuyez sur Actualiser maintenant dans Recherche > Un pays pour réessayer. Si cela se reproduit, vérifiez la connexion Internet dans Menu > Outils > Connexions de données.",
  "World Bank did not answer":
    "La Banque mondiale n'a pas répondu",
  "This figure comes from the World Bank's free development data, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. If it keeps happening, check the internet connection under Menu > Tools > Data connections.":
    "Ce chiffre provient des données de développement gratuites de la Banque mondiale, qui n'ont pas répondu cette fois-ci. C'est généralement temporaire. Appuyez sur Actualiser maintenant dans Recherche > Un pays pour réessayer. Si cela se reproduit, vérifiez la connexion Internet dans Menu > Outils > Connexions de données.",
  "Inflation comes from the International Monetary Fund's free World Economic Outlook data, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again.":
    "L'inflation provient des données gratuites des Perspectives de l'économie mondiale du Fonds monétaire international, qui n'ont pas répondu cette fois-ci. C'est généralement temporaire. Appuyez sur Actualiser maintenant dans Recherche > Un pays pour réessayer.",
  "BIS did not answer":
    "La BRI n'a pas répondu",
  "Policy rates come from the Bank for International Settlements (BIS) free data service, which did not answer this time. This is usually temporary. Press Refresh now under Research > One country to try again. If it keeps happening, check Menu > Tools > Data connections.":
    "Les taux directeurs proviennent du service de données gratuit de la Banque des règlements internationaux (BRI), qui n'a pas répondu cette fois-ci. C'est généralement temporaire. Appuyez sur Actualiser maintenant dans Recherche > Un pays pour réessayer. Si cela se reproduit, vérifiez Menu > Outils > Connexions de données.",
  "Not in BIS policy rates":
    "Absent des taux directeurs de la BRI",
  "Policy rates come from the Bank for International Settlements (BIS, the bank that central banks use), which collects them from about 40 central banks. This country is not one of them, so the app has no official figure. You can add the central bank's published rate through a data connector.":
    "Les taux directeurs proviennent de la Banque des règlements internationaux (BRI, la banque des banques centrales), qui les recueille auprès d'environ 40 banques centrales. Ce pays n'en fait pas partie, l'application n'a donc pas de chiffre officiel. Vous pouvez ajouter le taux publié par la banque centrale au moyen d'un connecteur de données.",
  "Not pulled yet":
    "Pas encore téléchargé",
  "Policy rates come from the Bank for International Settlements (BIS, the bank that central banks use). The BIS does publish this country's central bank rate, but the app does not download it yet: the app's tests of interest-rate signals were set up in advance on a fixed list of countries, and adding countries to that download would change those tests after the fact. You can add the central bank's published rate yourself through a data connector.":
    "Les taux directeurs proviennent de la Banque des règlements internationaux (BRI, la banque des banques centrales). La BRI publie bien le taux de la banque centrale de ce pays, mais l'application ne le télécharge pas encore : les tests des signaux de taux d'intérêt de l'application ont été établis à l'avance sur une liste fixe de pays, et ajouter des pays à ce téléchargement modifierait ces tests après coup. Vous pouvez ajouter vous-même le taux publié par la banque centrale au moyen d'un connecteur de données.",
  "OECD publishes no CLI":
    "L'OCDE ne publie pas d'IAC",
  "The OECD answered, but publishes no composite leading indicator for this country.":
    "L'OCDE a répondu, mais ne publie pas d'indicateur avancé composite pour ce pays.",
  "DBnomics did not answer":
    "DBnomics n'a pas répondu",
  "DBnomics (the free mirror the app reads OECD data from) did not answer yet; the app asks again within the hour.":
    "DBnomics (le miroir gratuit à partir duquel l'application lit les données de l'OCDE) n'a pas encore répondu ; l'application redemande dans l'heure.",
};
