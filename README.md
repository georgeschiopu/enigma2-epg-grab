# enigma2-epg-grab
EPG extrator from [Enigma2](https://en.wikipedia.org/wiki/Enigma_(DVB)) Bouquetes. It uses the [OpenWebIf API](https://github.com/E2OpenPlugins/e2openplugin-OpenWebif/wiki/OpenWebif-API-documentationss).

Wrote this script to extract the EPG from an Enigma2 satellite receiver and convert it into `XMLTV` format.

This is useful when you use the Enigma2 box to stream different bouquettes around the house as an IPTV server. Import the resulting XML files into your IPTV client and you're good to go.

Upon first run it will promp for the bouquettes you want to exatrac the EPG for and it will save them on the disk for next time.

This is useful if you want to run the script on a scheduled basis using a cron job or similar.

## Installation

`git clone git@github.com:georgeschiopu/enigma2-epg-grab.git`

You will need the [NodeJS](https://nodejs.org/en) runtime env. For simplcity, use [NVM](https://github.com/nvm-sh/nvm).


## Configuration

Change a few variables at the top of `index.js`:

```
const baseUrl = 'http://YOUR-ENIGMA2-BOX-IP';
const dummyUrl = 'DUMMY-URL-FOR-XMLTV-DOCUMENT';
const xmlpath = 'DIR-WHERE-TO-STORE-THE-XML-FILES';
```

## Usage
__Install the required dependencies:__

`npm install`

__Run the script:__

`node index.js`

_NOTE: This is far from perfect, but since I already spent a few hours for my pesonal usage, thought I'd share it maybe someone else will find it helpful._
