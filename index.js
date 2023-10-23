import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import fs from 'fs';

const run = 1;

/*
0 :: Eutelsat 9B
1 :: OrangeTv :: Basic
2 :: OrangeTV :: Premium
3 :: OrangeTV :: Music
4 :: DigiTV :: Basic
5 :: DigiTV :: Premium
6 :: DigiTV :: Music
7 :: Sky/Freeview
8 :: -----------------------------------------
9 :: Astra :: 19.2E :: ProSiebenSat1
10 :: Astra :: 23.5E :: M7
11 :: -----------------------------------------
12 :: Eutelsat :: 16.0E
13 :: Hotbird :: 13.0E
14 :: Astra :: 19.2E
15 :: Astra :: 23.5E
16 :: Hellas :: 39.0E
17 :: FocusSAT - Separator
18 :: Telekom Romania - Separator
19 :: Sky UK - Separator
20 :: Movistar+ Esp - Separator
21 :: Canal Digitaal HD - Separator
22 :: MEO - Separator
23 :: Last Scanned
24 :: Favourites (TV)
*/

const enabledBouquetes = [
    0,
    2,
    5,
    9, 10
]

const baseUrl = 'http://192.168.0.30';
const dummyUrl = 'https://myownsummer.co.uk';
const xmlpath = '/home/pi/EPG';

const getEpg = async (bRef) => (await fetch(`${baseUrl}/api/epgmulti?bRef=${bRef}`)).json()

const getBouquetes = async () => (await fetch(`${baseUrl}/api/bouquets`)).json();

const getServices = async (sRef) => (await fetch(`${baseUrl}/api/getservices?sRef=${sRef}`)).json();

const channelsRefs = {}

const getXMLTVHeader = () => `<tv generator-info-name="enigma2epg grabber" generator-info-url="${dummyUrl}">
`;

const buildPiconPath = (ref) => {
    const segments = ref.substring(0, ref.length-1).split(':');
    segments[2] = '1';

    return `${segments.join('_')}.png`;
}

const getXMLTVChannels = (channels) => {
    let xmlString = '';
    channels.services.map(c => {
        xmlString += `
    <channel id="${c.servicename}">
        <display-name lang="ro">${c.servicename}</display-name>
        <icon src="${baseUrl}/picon/${buildPiconPath(c.servicereference)}" />
        <url>${dummyUrl}</url>
    </channel>`
    });
    return xmlString;
}

const parseEPG = (epg) => {
    let epgData = '';
    epg.events.map(e => {
        epgData += `
<programme start="${DateTime.fromSeconds(e.begin_timestamp).toFormat('yyyyMMddHHmm00')} +0000" stop="${DateTime.fromSeconds(e.begin_timestamp+e.duration_sec).toFormat('yyyyMMddHHmm00')} +0000" channel="${channelsRefs[e.sref]}">
    <title lang="ro">${e.title}</title>
    <desc lang="ro">${e.longdesc}</desc>
    <category lang="ro">${e.genre}</category>
</programme>`;
    })

    return epgData;
}

const buildXMLTV = (epg, channels) => {
    let xmltv = getXMLTVHeader();

    xmltv += `${getXMLTVChannels(channels)}
    ${parseEPG(epg)}
</tv>`;

    return xmltv;
}

(async() => {

    const bouquetes = (await getBouquetes());

    if (!run) {
        let cnt = 0;
        bouquetes.bouquets.forEach(b  => {
            console.log(`${cnt} :: ${b[1]}`);
            cnt++;
        });
        return;
    }

    enabledBouquetes.forEach(async bIndex => {
        const bRef = bouquetes.bouquets[bIndex][0];
        const bName = bouquetes.bouquets[bIndex][1];

        const services = await getServices(bRef);
        services.services.map(s => channelsRefs[s.servicereference] = s.servicename )

        const epg = await getEpg(bRef);
        const xmltv = buildXMLTV(epg, services).replaceAll('&', '&amp;');
        const filename = `${xmlpath}/${bName.replaceAll(' ', '').replaceAll(':','')}.xml`; 

        try {
            fs.writeFileSync(filename, xmltv);
            console.log(`Generated file ${filename}`);
          } catch (err) {
            console.error(err);
          }

    });
})()
