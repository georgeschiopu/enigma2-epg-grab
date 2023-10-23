import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import fs from 'fs';
import checkbox from '@inquirer/checkbox';

const baseUrl = 'http://YOUR-ENIGMA2-BOX-IP';
const dummyUrl = 'DUMMY-URL-FOR-XMLTV-DOCUMENT';
const xmlpath = 'DIR-WHERE-TO-STORE-THE-XML-FILES';

const defaultLang = 'en';
const dataFileName = 'bouquetes.json';

let enabledBouquetes;

const readDataFile = async () => {
    try {
        const data = await fs.promises.readFile(dataFileName, 'utf-8');
        enabledBouquetes = JSON.parse(data);
    } catch (err) {
        enabledBouquetes = null;
    }
};

const getEpg = async (bRef) => {
    const response = await fetch(`${baseUrl}/api/epgmulti?bRef=${bRef}`);
    return response.json();
};

const getBouquetes = async () => {
    const response = await fetch(`${baseUrl}/api/bouquets`);
    return response.json();
};

const getServices = async (sRef) => {
    const response = await fetch(`${baseUrl}/api/getservices?sRef=${sRef}`);
    return response.json();
};

const channelsRefs = {};

const getXMLTVHeader = () => `
<tv generator-info-name="enigma2epg grabber" generator-info-url="${dummyUrl}">
`;

const buildPiconPath = (ref) => {
    const segments = ref.slice(0, -1).split(':');
    segments[2] = '1';
    return `${segments.join('_')}.png`;
};

const getFilename = (title) => `${title.replace(/[ /:]/g, '')}.xml`;

const xmlSafe = (string) => {
    return string.replace(/[&"'<>\t\n\r]/g, (match) => {
        const replacements = {
            '&': '&amp;',
            '"': '&quot;',
            "'": '&apos;',
            '<': '&lt;',
            '>': '&gt;',
            '\t': '&#x9;',
            '\n': '&#xA;',
            '\r': '&#xD;',
        };
        return replacements[match];
    });
};

const getXMLTVChannels = (channels) => {
    return channels.services
        .map((c) => `
    <channel id="${xmlSafe(c.servicename)}">
        <display-name lang="${defaultLang}">${xmlSafe(c.servicename)}</display-name>
        <icon src="${baseUrl}/picon/${buildPiconPath(c.servicereference)}" />
        <url>${dummyUrl}</url>
    </channel>`
        )
        .join('');
};

const parseEPG = (epg) => {
    return epg.events
        .map((e) => `
<programme start="${DateTime.fromSeconds(e.begin_timestamp).toFormat('yyyyMMddHHmm00')} +0000" stop="${DateTime.fromSeconds(e.begin_timestamp + e.duration_sec).toFormat('yyyyMMddHHmm00')} +0000" channel="${channelsRefs[e.sref]}">
    <title lang="${defaultLang}">${xmlSafe(e.title)}</title>
    <desc lang="${defaultLang}">${xmlSafe(e.longdesc)}</desc>
    <category lang="${defaultLang}">${xmlSafe(e.genre)}</category>
</programme>`
        )
        .join('');
};

const buildXMLTV = (epg, channels) => {
    const xmltv = getXMLTVHeader() + `
    ${getXMLTVChannels(channels)}
    ${parseEPG(epg)}
</tv>`;
    return xmltv;
};

(async () => {
    await readDataFile();
    const bouquetes = await getBouquetes();

    if (!enabledBouquetes) {
        
        let cnt = 0;
        enabledBouquetes = await checkbox({
            message: 'Select the bouquetes:',
            choices: bouquetes.bouquets.map((bItem) => {
                return {
                    name: `${bItem[1]}`,
                    value: cnt++,
                };
            }),
            pageSize: 20,
            loop: false,
        });

        fs.promises.writeFile(dataFileName, JSON.stringify(enabledBouquetes))
            .then(() => {
                console.log(`Successfully saved the processing bouquetes. 
Next time if you want to change the list to be processed delete 
the file "${dataFileName}" from this directory and manually re-run 
it with "node index.js".
`);
            })
            .catch((err) => {
                console.error(err);
            });
    }

    for (const bIndex of enabledBouquetes) {
        const bRef = bouquetes.bouquets[Number(bIndex)][0];
        const bName = bouquetes.bouquets[Number(bIndex)][1];

        const services = await getServices(bRef);
        services.services.forEach((s) => (channelsRefs[s.servicereference] = s.servicename));

        const epg = await getEpg(bRef);
        const xmltv = buildXMLTV(epg, services).replaceAll('&', '&amp;');
        const filename = `${xmlpath}/${getFilename(bName)}`;

        try {
            await fs.promises.writeFile(filename, xmltv);
            console.log(`Generated file ${filename}`);
        } catch (err) {
            console.error(err);
        }
    }
})();
