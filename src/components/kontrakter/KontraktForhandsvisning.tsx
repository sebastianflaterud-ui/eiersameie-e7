import { formatBelop, formatDatoFull } from '@/lib/format';

interface Eier {
  navn: string; type: string; inntektsandel_prosent: number;
  identifikator: string | null; epost: string | null; telefon: string | null;
}
interface KontraktLeietaker {
  id: string; leietaker_id: string; enhet_id: string;
  maanedsleie: number; depositum: number; innflytting: string; utflytting: string | null; aktiv: boolean;
}
interface Leietaker { id: string; navn: string; epost: string | null; telefon: string | null; personnr: string | null; }
interface Enhet { id: string; navn: string; etasje: string | null; }
interface Kontrakt {
  id: string; navn: string; boenhet: string; oppsigelsestid_mnd: number; depositum_multiplier: number;
  inkludert_i_leie: string | null; ikke_inkludert: string | null; betalingskonto: string | null;
  saerlige_bestemmelser: string | null; ordensregler: string | null;
}

interface Props {
  kontrakt: Kontrakt;
  utleiere: Eier[];
  aktiveLt: KontraktLeietaker[];
  tidligereLt: KontraktLeietaker[];
  leietakere: Leietaker[];
  enheter: Enhet[];
  versjonNr: number;
}

const getLt = (id: string, leietakere: Leietaker[]) => leietakere.find(l => l.id === id);
const getEnhet = (id: string, enheter: Enhet[]) => enheter.find(e => e.id === id);

export function KontraktForhandsvisning({ kontrakt, utleiere, aktiveLt, tidligereLt, leietakere, enheter, versjonNr }: Props) {
  const kontaktperson = utleiere.reduce((max, e) => e.inntektsandel_prosent > max.inntektsandel_prosent ? e : max, utleiere[0]);
  const dato = formatDatoFull(new Date());
  const utleierNavn = utleiere.map(e => e.navn).join(', ');

  const Section = ({ num, title, children }: { num: number; title: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3 font-sans">{num}. {title}</h2>
      <div className="space-y-2 leading-relaxed">{children}</div>
    </div>
  );

  return (
    <div className="max-w-[800px] mx-auto bg-white shadow-lg border rounded-lg p-12 font-serif text-[15px] text-gray-900 leading-relaxed print:shadow-none print:border-none print:p-0">
      {/* Header */}
      <div className="text-center mb-10 border-b pb-6">
        <h1 className="text-2xl font-bold font-sans tracking-tight">LEIEKONTRAKT FOR BOLIG</h1>
        <p className="text-base text-gray-600 mt-1">Enerhøgdveien 7A, Nesodden kommune</p>
      </div>

      <p className="mb-8">
        Denne avtalen regulerer leie av bolig mellom partene nedenfor.
        Avtalen følger husleieloven av 26. mars 1999 nr. 17.
      </p>

      <Section num={1} title="UTLEIER">
        {utleiere.map((e, i) => (
          <div key={e.navn} className="mb-3 pl-4 border-l-2 border-gray-200">
            <p className="font-semibold">Utleier {i + 1}:</p>
            <p>Navn: {e.navn}</p>
            <p>Adresse: Enerhøgdveien 7A, 1459 Nesodden</p>
            {e.telefon && <p>Telefon: {e.telefon}</p>}
            {e.epost && <p>E-post: {e.epost}</p>}
            {e.type === 'aksjeselskap' && e.identifikator && (
              <>
                <p>Org.nr: {e.identifikator}</p>
                <p>v/: {kontaktperson.navn}</p>
              </>
            )}
          </div>
        ))}
        <p className="mt-2">
          Utleierne eier eiendommen sammen og opptrer samlet som utleier.
          Avtalen er bindende for alle. {kontaktperson.navn} er kontaktperson
          og mottar henvendelser på vegne av utleierne.
        </p>
      </Section>

      <Section num={2} title="LEIETAKERE">
        {aktiveLt.map((kl, i) => {
          const lt = getLt(kl.leietaker_id, leietakere);
          const enhet = getEnhet(kl.enhet_id, enheter);
          return (
            <div key={kl.id} className="mb-3 pl-4 border-l-2 border-gray-200">
              <p className="font-semibold">Leietaker {i + 1}:</p>
              <p>Navn: {lt?.navn}</p>
              {lt?.personnr && <p>Personnummer: {lt.personnr}</p>}
              {lt?.epost && <p>E-post: {lt.epost}</p>}
              {lt?.telefon && <p>Telefon: {lt.telefon}</p>}
              <p>Rom: {enhet?.navn} {enhet?.etasje ? `(${enhet.etasje})` : ''}</p>
              <p>Månedsleie: kr {formatBelop(kl.maanedsleie).replace(' kr', '')}</p>
              <p>Depositum: kr {formatBelop(kl.depositum).replace(' kr', '')}</p>
              <p>Innflytting: {formatDatoFull(kl.innflytting)}</p>
            </div>
          );
        })}
      </Section>

      <Section num={3} title="EIENDOM">
        <p>Adresse: Enerhøgdveien 7A, 1459 Nesodden</p>
        <p>Kommune: Nesodden</p>
        <p>Eiendommen er en enebolig. Utleierne bor i eiendommen.</p>
      </Section>

      <Section num={4} title="HVA SOM LEIES UT">
        <p>Avtalen gjelder utleie av hybel: ett rom i en bolig der utleier selv bor. Leieforholdet reguleres av husleieloven § 9-3. Leier har derfor et enklere oppsigelsesvern enn ved leie av selvstendig bolig.</p>
        <p><strong>Rommet:</strong> Hver leietaker disponerer ett eget soverom. Rommene er delvis møblert.</p>
        <p><strong>Fellesarealer:</strong> Leietakere har tilgang til kjøkken, stue, bad, vaskerom og uteareal.</p>
        <p><strong>Begrensninger:</strong> Leietakere kan ikke bruke andre soverom eller rom som utleier har reservert for eget bruk.</p>
        <p><strong>Møbler i fellesarealer:</strong> Fellesarealene er møblert av utleier. Utleier har ikke plikt til å anskaffe flere møbler eller erstatninger utover det som er på plass ved overtakelse.</p>
        <p><strong>Lagring:</strong> Det følger ingen bod eller annen lagringsplass med leieforholdet.</p>
      </Section>

      <Section num={5} title="VARIGHET">
        <p>Leieforholdet løper uten sluttdato fra leietakers innflyttingsdato. Begge parter kan si opp med {kontrakt.oppsigelsestid_mnd} måneders skriftlig varsel. Oppsigelsesfristen regnes fra utgangen av den måneden varselet gis.</p>
        <p>Fordi dette er en hybel der utleier bor i boligen, har utleier fri oppsigelsesadgang etter husleieloven § 9-3. Utleier trenger ikke oppgi noen grunn.</p>
      </Section>

      <Section num={6} title="LEIE">
        <p>Månedsleie per leietaker er angitt i punkt 2.</p>
        <p>Leien dekker {kontrakt.inkludert_i_leie || 'strøm, vann, avløp og internett'}. {kontrakt.ikke_inkludert || 'Kabel-TV'} er ikke inkludert. Leier ordner eventuelt eget abonnement.</p>
        <p>Løpende fellesutgifter som filtre, såper, støvsugerposter og lignende deles mellom leietakerne.</p>
      </Section>

      <Section num={7} title="ELBILLADING">
        <p>Leier kan lade elbil på eiendommens ladestasjon. Forbruket måles separat og faktureres i tillegg til husleien. Utleier setter pris per kWh basert på gjeldende strømpris pluss nettleie.</p>
        <p>Leier kan bruke maksimalt 1 parkeringsplass på eiendommen.</p>
      </Section>

      <Section num={8} title="BETALING">
        <p>Leien betales forskuddsvis innen den 1. i hver måned til konto {kontrakt.betalingskonto || '1224 18 35675'}. Betalingspåminnelser kan sendes på e-post eller SMS.</p>
      </Section>

      <Section num={9} title="JUSTERING AV LEIEN">
        <p>Utleier kan justere leien årlig i takt med konsumprisindeksen. Første justering kan skje tidligst 12 måneder etter oppstart, med en måneds skriftlig varsel (husleieloven § 4-2).</p>
        <p>Har leieforholdet vart i minst 2 år og 6 måneder uten annen justering enn konsumprisindeks, kan begge parter kreve at leien settes til markedsleie med 6 måneders skriftlig varsel (husleieloven § 4-3).</p>
      </Section>

      <Section num={10} title="BOLIGENS STAND VED INNFLYTTING">
        <p>Boligen leies ut slik den er ved overtakelse (husleieloven § 2-5).</p>
      </Section>

      <Section num={11} title="UTLEIERS ANSVAR">
        <p>Utleier skal sørge for at boligen er tilgjengelig for leier gjennom hele leietiden, og holde boligen i den stand som følger av avtalen og husleieloven.</p>
        <p>Bryter utleier avtalen, kan leier gjøre gjeldende sine rettigheter etter husleieloven kapittel 2 og § 5-7. Leier kan ikke kreve erstatning for indirekte tap (§ 2-14 andre avsnitt).</p>
      </Section>

      <Section num={12} title="VEDLIKEHOLDS- OG AKTSOMHETSKRAV">
        <p>Leier skal bidra til vedlikehold av boligen. Følgende gjelder:</p>
        <ol className="list-[lower-alpha] pl-6 space-y-1">
          <li><strong>Vannstengning:</strong> Leier skal vite hvor hovedstoppekran og lokale stoppekraner er. Ved vannlekkasje skal leier straks stenge vannet og varsle utleier.</li>
          <li><strong>Hage og uteareal:</strong> Leier skal bidra til vedlikehold av hage og uteareal. Fordelingen avtales mellom beboerne.</li>
          <li><strong>Snømåking:</strong> Leier skal bidra til snømåking av inngangsparti, adkomstvei og parkeringsområde.</li>
          <li><strong>Komfyrtopp og stekeovn:</strong> Leier skal rengjøre komfyrtoppen etter hver bruk. Stekeovnen rengjøres minst en gang i måneden.</li>
          <li><strong>Ventilasjonsfiltre:</strong> Leier skal bidra til rengjøring eller bytte av filtre minst hver tredje måned. Kostnaden deles mellom beboerne.</li>
          <li><strong>Ventilasjon:</strong> Leier skal ikke blokkere eller tildekke ventilasjonsåpninger.</li>
          <li><strong>Avløp og sluk:</strong> Leier skal bidra til å holde sluk og avløp frie. Tette avløp som skyldes manglende vedlikehold er leiers ansvar.</li>
          <li><strong>Frostforebygging:</strong> Boligen skal holdes oppvarmet ved fare for frost.</li>
          <li><strong>Generell aktsomhet:</strong> Leier skal behandle fellesarealer, inventar og utstyr med normal forsiktighet.</li>
        </ol>
      </Section>

      <Section num={13} title="ORDENSREGLER">
        <ol className="list-[lower-alpha] pl-6 space-y-1">
          <li>Røyking er ikke tillatt inne i boligen eller i hagen.</li>
          <li>Husdyr er ikke tillatt uten skriftlig samtykke fra utleier.</li>
          <li>Fremleie er ikke tillatt.</li>
          <li>Kun den som står oppført som leietaker kan bo fast i rommet.</li>
          <li>Gjester kan overnatte i kortere perioder. Hyppig eller langvarig gjesteovernatting regnes som brudd på avtalen.</li>
          <li>Ro mellom kl. 23:00 og 07:00 på hverdager, og mellom kl. 00:00 og 09:00 i helger og på helligdager.</li>
          <li>Kjøkken og fellesarealer ryddes umiddelbart etter bruk.</li>
          <li>Personlige eiendeler lagres ikke i fellesarealer.</li>
          <li>Maksimalt 1 bil per leietaker på eiendommen.</li>
        </ol>
        {kontrakt.ordensregler && <p className="mt-2">{kontrakt.ordensregler}</p>}
      </Section>

      <Section num={14} title="ANDRE PLIKTER FOR LEIER">
        <p>Boligen skal bare brukes til beboelse. Endringer krever skriftlig godkjenning fra utleier.</p>
        <p>Leier er ansvarlig for skade voldt av leier, gjester eller andre som leier slipper inn (husleieloven § 5-8).</p>
        <p>Akutte skader meldes til utleier umiddelbart. Andre feil og mangler meldes uten unødig opphold.</p>
        <p>Utleier har rett til tilsyn etter rimelig forhåndsvarsel.</p>
      </Section>

      <Section num={15} title="OPPSIGELSE">
        <p>Oppsigelse skal gis skriftlig. Begge parter kan si opp med {kontrakt.oppsigelsestid_mnd} måneders varsel fra utgangen av den måneden oppsigelsen gis.</p>
        <p>Fordi dette er en hybel der utleier bor i boligen, har utleier fri oppsigelsesadgang etter husleieloven § 9-3. Reglene om begrunnelse (§ 9-7) og protestrett (§ 9-8) gjelder ikke.</p>
      </Section>

      <Section num={16} title="UTKASTELSE OG HEVING">
        <p>Betaler ikke leier husleien og flytter ikke innen 2 uker etter skriftlig varsel (tvangsfullbyrdelsesloven § 4-18), kan utleier kreve utkastelse.</p>
        <p>Ved alvorlig avtalebrudd kan utleier heve avtalen med umiddelbar virkning (husleieloven § 9-9).</p>
      </Section>

      <Section num={17} title="VED FRAFLYTTING">
        <p>Boligen skal være ryddet, rengjort og i god stand. Utleier godtar normal slitasje.</p>
      </Section>

      <Section num={18} title="FORSIKRING">
        <p>Leier skal ha innboforsikring gjennom hele leieforholdet.</p>
      </Section>

      <Section num={19} title="DEPOSITUM">
        <p>Depositum per leietaker er angitt i punkt 2. Beløpet tilsvarer {kontrakt.depositum_multiplier} måneders leie.</p>
        <p>Beløpet settes på en egen konto i leiers navn. Utleier dekker opprettelseskostnadene. Reglene i husleieloven § 3-5 gjelder for utbetaling.</p>
      </Section>

      <Section num={20} title="NØKLER">
        <p>Leier får tilgang til boligen via nøkkelboks.</p>
      </Section>

      <Section num={21} title="TINGLYSING">
        <p>Kontrakten kan ikke tinglyses uten utleiers samtykke.</p>
      </Section>

      <Section num={22} title="ANDRE BESTEMMELSER">
        <p>Denne kontrakten gjelder utleie av hybel i bolig der utleier selv bor (husleieloven § 9-3). Utleierne bruker selv mer enn halvparten av boligens utleieverdi. Utleieforholdet er en del av privat kapitalforvaltning og drives ikke som næringsvirksomhet.</p>
        <p>{utleierNavn} er sameiere i eiendommen. Alle hefter solidarisk for utleiers forpliktelser etter denne avtalen.</p>
        <p>Uenigheter forsøkes først løst mellom partene. Deretter Husleietvistutvalget eller domstolene.</p>
        {kontrakt.saerlige_bestemmelser && <p className="mt-2">{kontrakt.saerlige_bestemmelser}</p>}
      </Section>

      <Section num={23} title="PERSONVERN">
        <p>Utleier behandler personopplysninger etter personopplysningsloven og GDPR. Opplysningene brukes til å administrere leieforholdet og oppbevares i henhold til lovpålagte frister. Leier har rett til innsyn, retting og sletting.</p>
      </Section>

      <Section num={24} title="LOVVALG">
        <p>Avtalen er underlagt norsk lov. Husleieloven gjelder. Bestemmelser som gir leier dårligere vilkår enn loven tillater er ugyldige.</p>
      </Section>

      <Section num={25} title="ENDRINGER I BOFELLESSKAPET">
        <p>Når en leietaker flytter ut eller en ny leietaker flytter inn, oppdateres denne kontrakten. Endringer påvirker ikke øvrige leietakeres rettigheter eller plikter.</p>
      </Section>

      {tidligereLt.length > 0 && (
        <Section num={26} title="TIDLIGERE LEIETAKERE">
          {tidligereLt.map(kl => {
            const lt = getLt(kl.leietaker_id, leietakere);
            const enhet = getEnhet(kl.enhet_id, enheter);
            return (
              <div key={kl.id} className="pl-4 border-l-2 border-gray-200 mb-2">
                <p>Navn: {lt?.navn}</p>
                <p>Rom: {enhet?.navn}</p>
                <p>Innflytting: {formatDatoFull(kl.innflytting)}</p>
                {kl.utflytting && <p>Utflytting: {formatDatoFull(kl.utflytting)}</p>}
              </div>
            );
          })}
        </Section>
      )}

      {/* Footer */}
      <div className="border-t pt-4 mt-10 text-center text-sm text-gray-500">
        Generert fra Transaksjonsbanken {dato} — Versjon {versjonNr}
      </div>
    </div>
  );
}
