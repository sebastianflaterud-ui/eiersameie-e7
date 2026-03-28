import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { fontSize: 8, color: '#666', marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, fontSize: 7, color: '#999', textAlign: 'center' },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 10, textAlign: 'center', color: '#555', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 16, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#ddd', paddingBottom: 3 },
  paragraph: { marginBottom: 6 },
  bold: { fontFamily: 'Helvetica-Bold' },
  indent: { marginLeft: 16 },
  personBlock: { marginBottom: 8, paddingLeft: 10 },
  label: { color: '#555' },
  listItem: { marginBottom: 3, paddingLeft: 12 },
});

const fmtBelop = (n: number) => {
  const abs = Math.abs(n);
  const [int, dec = '00'] = abs.toFixed(2).split('.');
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${formatted},${dec} kr`;
};

const fmtDato = (d: string) => {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

const fmtDatoFull = (d: string) => {
  if (!d) return '';
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
};

interface PDFData {
  kontrakt: any;
  utleiere: any[];
  aktiveLt: any[];
  tidligereLt: any[];
  leietakere: any[];
  enheter: any[];
  versjonNr: number;
  dato: string;
}

const getLt = (id: string, leietakere: any[]) => leietakere.find((l: any) => l.id === id);
const getEnhet = (id: string, enheter: any[]) => enheter.find((e: any) => e.id === id);

export function LeiekontraktPDF({ data }: { data: PDFData }) {
  const { kontrakt, utleiere, aktiveLt, tidligereLt, leietakere, enheter, versjonNr, dato } = data;
  const kontaktperson = utleiere.reduce((a: any, b: any) => (a.inntektsandel_prosent > b.inntektsandel_prosent ? a : b), utleiere[0]);
  const utleierNavnListe = utleiere.map((u: any) => u.navn).join(', ');

  const headerText = `Leiekontrakt — Enerhøgdveien 7A`;
  const footerText = `Generert fra Transaksjonsbanken ${fmtDatoFull(dato)} — Versjon ${versjonNr}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerText}</Text>
          <Text>Side 1</Text>
        </View>

        <Text style={styles.title}>LEIEKONTRAKT FOR BOLIG</Text>
        <Text style={styles.subtitle}>Enerhøgdveien 7A, Nesodden kommune</Text>

        <Text style={styles.paragraph}>
          Denne avtalen regulerer leie av bolig mellom partene nedenfor. Avtalen følger husleieloven av 26. mars 1999 nr. 17.
        </Text>

        {/* 1. UTLEIER */}
        <Text style={styles.sectionTitle}>1. UTLEIER</Text>
        {utleiere.map((u: any, i: number) => (
          <View key={u.id} style={styles.personBlock}>
            <Text style={styles.bold}>Utleier {i + 1}:</Text>
            <Text>Navn: {u.navn}</Text>
            <Text>Adresse: Enerhøgdveien 7A, 1459 Nesodden</Text>
            {u.telefon && <Text>Telefon: {u.telefon}</Text>}
            {u.epost && <Text>E-post: {u.epost}</Text>}
            {u.type === 'aksjeselskap' && u.identifikator && (
              <>
                <Text>Org.nr: {u.identifikator}</Text>
                <Text>v/: {kontaktperson.navn}</Text>
              </>
            )}
          </View>
        ))}
        <Text style={styles.paragraph}>
          Utleierne eier eiendommen sammen og opptrer samlet som utleier. Avtalen er bindende for alle. {kontaktperson.navn} er kontaktperson og mottar henvendelser på vegne av utleierne.
        </Text>

        {/* 2. LEIETAKERE */}
        <Text style={styles.sectionTitle}>2. LEIETAKERE</Text>
        {aktiveLt.map((kl: any, i: number) => {
          const lt = getLt(kl.leietaker_id, leietakere);
          const enhet = getEnhet(kl.enhet_id, enheter);
          return (
            <View key={kl.id} style={styles.personBlock}>
              <Text style={styles.bold}>Leietaker {i + 1}:</Text>
              <Text>Navn: {lt?.navn || 'Ukjent'}</Text>
              {lt?.personnr && <Text>Personnummer: {lt.personnr}</Text>}
              {lt?.epost && <Text>E-post: {lt.epost}</Text>}
              {lt?.telefon && <Text>Telefon: {lt.telefon}</Text>}
              <Text>Rom: {enhet?.navn || 'Ukjent'}{enhet?.etasje ? ` (${enhet.etasje})` : ''}</Text>
              <Text>Månedsleie: kr {fmtBelop(kl.maanedsleie)}</Text>
              <Text>Depositum: kr {fmtBelop(kl.depositum)}</Text>
              <Text>Innflytting: {fmtDatoFull(kl.innflytting)}</Text>
            </View>
          );
        })}

        {/* 3. EIENDOM */}
        <Text style={styles.sectionTitle}>3. EIENDOM</Text>
        <Text style={styles.paragraph}>Adresse: Enerhøgdveien 7A, 1459 Nesodden{'\n'}Kommune: Nesodden{'\n'}Eiendommen er en enebolig. Utleierne bor i eiendommen.</Text>

        {/* 4. HVA SOM LEIES UT */}
        <Text style={styles.sectionTitle}>4. HVA SOM LEIES UT</Text>
        <Text style={styles.paragraph}>
          Avtalen gjelder utleie av hybel: ett rom i en bolig der utleier selv bor. Leieforholdet reguleres av husleieloven § 9-3. Leier har derfor et enklere oppsigelsesvern enn ved leie av selvstendig bolig.
        </Text>
        <Text style={styles.paragraph}>
          Rommet: Hver leietaker disponerer ett eget soverom. Rommene er delvis møblert.
        </Text>
        <Text style={styles.paragraph}>
          Fellesarealer: Leietakere har tilgang til kjøkken, stue, bad, vaskerom og uteareal.
        </Text>
        <Text style={styles.paragraph}>
          Begrensninger: Leietakere kan ikke bruke andre soverom eller rom som utleier har reservert for eget bruk. Møbler i fellesarealer er møblert av utleier. Utleier har ikke plikt til å anskaffe flere møbler eller erstatninger utover det som er på plass ved overtakelse. Det følger ingen bod eller annen lagringsplass med leieforholdet.
        </Text>

        {/* 5-26 */}
        <Text style={styles.sectionTitle}>5. VARIGHET</Text>
        <Text style={styles.paragraph}>
          Leieforholdet løper uten sluttdato fra leietakers innflyttingsdato. Begge parter kan si opp med {kontrakt.oppsigelsestid_mnd} måneders skriftlig varsel. Oppsigelsesfristen regnes fra utgangen av den måneden varselet gis.
        </Text>
        <Text style={styles.paragraph}>
          Fordi dette er en hybel der utleier bor i boligen, har utleier fri oppsigelsesadgang etter husleieloven § 9-3. Reglene om begrunnelse (§ 9-7) og protestrett (§ 9-8) gjelder ikke.
        </Text>

        <Text style={styles.sectionTitle}>6. LEIE</Text>
        <Text style={styles.paragraph}>
          Månedsleie per leietaker er angitt i punkt 2. Leien dekker {kontrakt.inkludert_i_leie || 'strøm, vann, avløp og internett'}. {kontrakt.ikke_inkludert || 'Kabel-TV'} er ikke inkludert. Leier ordner eventuelt eget abonnement. Løpende fellesutgifter som filtre, såper, støvsugerposter og lignende deles mellom leietakerne.
        </Text>

        <Text style={styles.sectionTitle}>7. ELBILLADING</Text>
        <Text style={styles.paragraph}>
          Leier kan lade elbil på eiendommens ladestasjon. Forbruket måles separat og faktureres i tillegg til husleien. Utleier setter pris per kWh basert på gjeldende strømpris pluss nettleie. Leier kan bruke maksimalt 1 parkeringsplass på eiendommen.
        </Text>

        <Text style={styles.sectionTitle}>8. BETALING</Text>
        <Text style={styles.paragraph}>
          Leien betales forskuddsvis innen den 1. i hver måned til konto {kontrakt.betalingskonto || '1224 18 35675'}. Betalingspåminnelser kan sendes på e-post eller SMS.
        </Text>

        <Text style={styles.sectionTitle}>9. JUSTERING AV LEIEN</Text>
        <Text style={styles.paragraph}>
          Utleier kan justere leien årlig i takt med konsumprisindeksen. Første justering kan skje tidligst 12 måneder etter oppstart, med en måneds skriftlig varsel (husleieloven § 4-2). Har leieforholdet vart i minst 2 år og 6 måneder uten annen justering enn konsumprisindeks, kan begge parter kreve at leien settes til markedsleie med 6 måneders skriftlig varsel (husleieloven § 4-3).
        </Text>

        <Text style={styles.sectionTitle}>10. BOLIGENS STAND VED INNFLYTTING</Text>
        <Text style={styles.paragraph}>Boligen leies ut slik den er ved overtakelse (husleieloven § 2-5).</Text>

        <Text style={styles.sectionTitle}>11. UTLEIERS ANSVAR</Text>
        <Text style={styles.paragraph}>
          Utleier skal sørge for at boligen er tilgjengelig for leier gjennom hele leietiden, og holde boligen i den stand som følger av avtalen og husleieloven. Bryter utleier avtalen, kan leier gjøre gjeldende sine rettigheter etter husleieloven kapittel 2 og § 5-7. Leier kan ikke kreve erstatning for indirekte tap (§ 2-14 andre avsnitt).
        </Text>

        <Text style={styles.sectionTitle}>12. VEDLIKEHOLDS- OG AKTSOMHETSKRAV</Text>
        <Text style={styles.paragraph}>Leier skal bidra til vedlikehold av boligen. Følgende gjelder:</Text>
        {[
          'a) Vannstengning: Leier skal vite hvor hovedstoppekran og lokale stoppekraner er. Ved vannlekkasje skal leier straks stenge vannet og varsle utleier.',
          'b) Hage og uteareal: Leier skal bidra til vedlikehold av hage og uteareal. Fordelingen avtales mellom beboerne.',
          'c) Snømåking: Leier skal bidra til snømåking av inngangsparti, adkomstvei og parkeringsområde.',
          'd) Komfyrtopp og stekeovn: Leier skal rengjøre komfyrtoppen etter hver bruk. Stekeovnen rengjøres minst en gang i måneden.',
          'e) Ventilasjonsfiltre: Leier skal bidra til rengjøring eller bytte av filtre minst hver tredje måned. Kostnaden deles mellom beboerne.',
          'f) Ventilasjon: Leier skal ikke blokkere eller tildekke ventilasjonsåpninger.',
          'g) Avløp og sluk: Leier skal bidra til å holde sluk og avløp frie. Tette avløp som skyldes manglende vedlikehold er leiers ansvar.',
          'h) Frostforebygging: Boligen skal holdes oppvarmet ved fare for frost.',
          'i) Generell aktsomhet: Leier skal behandle fellesarealer, inventar og utstyr med normal forsiktighet.',
        ].map((item, i) => <Text key={i} style={styles.listItem}>{item}</Text>)}

        <Text style={styles.sectionTitle}>13. ORDENSREGLER</Text>
        {[
          'a) Røyking er ikke tillatt inne i boligen eller i hagen.',
          'b) Husdyr er ikke tillatt uten skriftlig samtykke fra utleier.',
          'c) Fremleie er ikke tillatt.',
          'd) Kun den som står oppført som leietaker kan bo fast i rommet.',
          'e) Gjester kan overnatte i kortere perioder. Hyppig eller langvarig gjesteovernatting regnes som brudd på avtalen.',
          'f) Ro mellom kl. 23:00 og 07:00 på hverdager, og mellom kl. 00:00 og 09:00 i helger og på helligdager.',
          'g) Kjøkken og fellesarealer ryddes umiddelbart etter bruk.',
          'h) Personlige eiendeler lagres ikke i fellesarealer.',
          'i) Maksimalt 1 bil per leietaker på eiendommen.',
        ].map((item, i) => <Text key={i} style={styles.listItem}>{item}</Text>)}
        {kontrakt.ordensregler && <Text style={styles.paragraph}>{kontrakt.ordensregler}</Text>}

        <Text style={styles.sectionTitle}>14. ANDRE PLIKTER FOR LEIER</Text>
        <Text style={styles.paragraph}>
          Boligen skal bare brukes til beboelse. Endringer krever skriftlig godkjenning fra utleier. Leier er ansvarlig for skade voldt av leier, gjester eller andre som leier slipper inn (husleieloven § 5-8). Akutte skader meldes til utleier umiddelbart. Andre feil og mangler meldes uten unødig opphold. Utleier har rett til tilsyn etter rimelig forhåndsvarsel.
        </Text>

        <Text style={styles.sectionTitle}>15. OPPSIGELSE</Text>
        <Text style={styles.paragraph}>
          Oppsigelse skal gis skriftlig. Begge parter kan si opp med {kontrakt.oppsigelsestid_mnd} måneders varsel fra utgangen av den måneden oppsigelsen gis. Fordi dette er en hybel der utleier bor i boligen, har utleier fri oppsigelsesadgang etter husleieloven § 9-3. Reglene om begrunnelse (§ 9-7) og protestrett (§ 9-8) gjelder ikke.
        </Text>

        <Text style={styles.sectionTitle}>16. UTKASTELSE OG HEVING</Text>
        <Text style={styles.paragraph}>
          Betaler ikke leier husleien og flytter ikke innen 2 uker etter skriftlig varsel (tvangsfullbyrdelsesloven § 4-18), kan utleier kreve utkastelse. Ved alvorlig avtalebrudd kan utleier heve avtalen med umiddelbar virkning (husleieloven § 9-9).
        </Text>

        <Text style={styles.sectionTitle}>17. VED FRAFLYTTING</Text>
        <Text style={styles.paragraph}>Boligen skal være ryddet, rengjort og i god stand. Utleier godtar normal slitasje.</Text>

        <Text style={styles.sectionTitle}>18. FORSIKRING</Text>
        <Text style={styles.paragraph}>Leier skal ha innboforsikring gjennom hele leieforholdet.</Text>

        <Text style={styles.sectionTitle}>19. DEPOSITUM</Text>
        <Text style={styles.paragraph}>
          Depositum per leietaker er angitt i punkt 2. Beløpet tilsvarer {kontrakt.depositum_multiplier} måneders leie. Beløpet settes på en egen konto i leiers navn. Utleier dekker opprettelseskostnadene. Reglene i husleieloven § 3-5 gjelder for utbetaling.
        </Text>

        <Text style={styles.sectionTitle}>20. NØKLER</Text>
        <Text style={styles.paragraph}>Leier får tilgang til boligen via nøkkelboks.</Text>

        <Text style={styles.sectionTitle}>21. TINGLYSING</Text>
        <Text style={styles.paragraph}>Kontrakten kan ikke tinglyses uten utleiers samtykke.</Text>

        <Text style={styles.sectionTitle}>22. ANDRE BESTEMMELSER</Text>
        <Text style={styles.paragraph}>
          Denne kontrakten gjelder utleie av hybel i bolig der utleier selv bor (husleieloven § 9-3). Utleierne bruker selv mer enn halvparten av boligens utleieverdi. Utleieforholdet er en del av privat kapitalforvaltning og drives ikke som næringsvirksomhet.
        </Text>
        <Text style={styles.paragraph}>
          {utleierNavnListe} er sameiere i eiendommen. Alle hefter solidarisk for utleiers forpliktelser etter denne avtalen.
        </Text>
        <Text style={styles.paragraph}>
          Uenigheter forsøkes først løst mellom partene. Deretter Husleietvistutvalget eller domstolene.
        </Text>
        {kontrakt.saerlige_bestemmelser && <Text style={styles.paragraph}>{kontrakt.saerlige_bestemmelser}</Text>}

        <Text style={styles.sectionTitle}>23. PERSONVERN</Text>
        <Text style={styles.paragraph}>
          Utleier behandler personopplysninger etter personopplysningsloven og GDPR. Opplysningene brukes til å administrere leieforholdet og oppbevares i henhold til lovpålagte frister. Leier har rett til innsyn, retting og sletting.
        </Text>

        <Text style={styles.sectionTitle}>24. LOVVALG</Text>
        <Text style={styles.paragraph}>
          Avtalen er underlagt norsk lov. Husleieloven gjelder. Bestemmelser som gir leier dårligere vilkår enn loven tillater er ugyldige.
        </Text>

        <Text style={styles.sectionTitle}>25. ENDRINGER I BOFELLESSKAPET</Text>
        <Text style={styles.paragraph}>
          Når en leietaker flytter ut eller en ny leietaker flytter inn, oppdateres denne kontrakten. Endringer påvirker ikke øvrige leietakeres rettigheter eller plikter.
        </Text>

        {/* 26. TIDLIGERE LEIETAKERE */}
        {tidligereLt.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>26. TIDLIGERE LEIETAKERE</Text>
            {tidligereLt.map((kl: any) => {
              const lt = getLt(kl.leietaker_id, leietakere);
              const enhet = getEnhet(kl.enhet_id, enheter);
              return (
                <View key={kl.id} style={styles.personBlock}>
                  <Text>Navn: {lt?.navn || 'Ukjent'}</Text>
                  <Text>Rom: {enhet?.navn || 'Ukjent'}</Text>
                  <Text>Innflytting: {fmtDatoFull(kl.innflytting)}</Text>
                  {kl.utflytting && <Text>Utflytting: {fmtDatoFull(kl.utflytting)}</Text>}
                </View>
              );
            })}
          </>
        )}

        <View style={styles.footer}>
          <Text>{footerText}</Text>
        </View>
      </Page>
    </Document>
  );
}
