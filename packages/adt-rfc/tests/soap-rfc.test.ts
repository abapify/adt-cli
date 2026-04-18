import { describe, it, expect } from 'vitest';
import {
  buildRfcSoapEnvelope,
  parseRfcSoapResponse,
  createRfcClient,
  RfcSoapFault,
  RfcTransportUnavailable,
} from '../src/index';

describe('buildRfcSoapEnvelope', () => {
  it('builds a minimal STFC_CONNECTION envelope with REQUTEXT', () => {
    const xml = buildRfcSoapEnvelope('STFC_CONNECTION', {
      REQUTEXT: 'hello',
    });
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xml).toContain(
      'xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/"',
    );
    expect(xml).toContain(
      '<urn:STFC_CONNECTION xmlns:urn="urn:sap-com:document:sap:rfc:functions">',
    );
    expect(xml).toContain('<REQUTEXT>hello</REQUTEXT>');
    expect(xml).toContain('</urn:STFC_CONNECTION>');
  });

  it('upper-cases the function module name', () => {
    const xml = buildRfcSoapEnvelope('stfc_connection');
    expect(xml).toContain('<urn:STFC_CONNECTION ');
    expect(xml).toContain('</urn:STFC_CONNECTION>');
  });

  it('escapes XML special characters in scalar values', () => {
    const xml = buildRfcSoapEnvelope('FM', { REQUTEXT: '<a>&b' });
    expect(xml).toContain('<REQUTEXT>&lt;a&gt;&amp;b</REQUTEXT>');
  });

  it('renders a structure as nested element', () => {
    const xml = buildRfcSoapEnvelope('FM', {
      ADDRESS: { STREET: 'Main', CITY: 'Amsterdam' },
    });
    expect(xml).toContain(
      '<ADDRESS><STREET>Main</STREET><CITY>Amsterdam</CITY></ADDRESS>',
    );
  });

  it('renders a table as <NAME><item>…</item></NAME> sequence', () => {
    const xml = buildRfcSoapEnvelope('FM', {
      ROWS: [{ V: '1' }, { V: '2' }],
    });
    expect(xml).toContain(
      '<ROWS><item><V>1</V></item><item><V>2</V></item></ROWS>',
    );
  });
});

describe('parseRfcSoapResponse', () => {
  it('parses STFC_CONNECTION.Response with echoed REQUTEXT', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <rfc:STFC_CONNECTION.Response xmlns:rfc="urn:sap-com:document:sap:rfc:functions">
      <ECHOTEXT>hello</ECHOTEXT>
      <RESPTEXT>SAP R/3 Rel. 7.55   Sysid: TRL</RESPTEXT>
    </rfc:STFC_CONNECTION.Response>
  </soap-env:Body>
</soap-env:Envelope>`;
    const out = parseRfcSoapResponse(xml);
    expect(out).toEqual({
      ECHOTEXT: 'hello',
      RESPTEXT: 'SAP R/3 Rel. 7.55   Sysid: TRL',
    });
  });

  it('parses a table parameter (list of items)', () => {
    const xml = `<?xml version="1.0"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <rfc:FMResponse xmlns:rfc="urn:sap-com:document:sap:rfc:functions">
      <USR_LIST>
        <item><BNAME>USER1</BNAME></item>
        <item><BNAME>USER2</BNAME></item>
      </USR_LIST>
    </rfc:FMResponse>
  </soap-env:Body>
</soap-env:Envelope>`;
    const out = parseRfcSoapResponse(xml);
    expect(out.USR_LIST).toEqual([{ BNAME: 'USER1' }, { BNAME: 'USER2' }]);
  });

  it('throws RfcSoapFault when the body contains soap:Fault', () => {
    const xml = `<?xml version="1.0"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <soap-env:Fault>
      <faultcode>Server</faultcode>
      <faultstring>Function module FOO not found</faultstring>
    </soap-env:Fault>
  </soap-env:Body>
</soap-env:Envelope>`;
    expect(() => parseRfcSoapResponse(xml)).toThrow(RfcSoapFault);
  });

  it('throws a clear error when the body lacks Envelope', () => {
    expect(() => parseRfcSoapResponse('<html>oops</html>')).toThrow(
      /no <Envelope>/,
    );
  });
});

describe('buildRfcSoapEnvelope / parseRfcSoapResponse round-trip', () => {
  it('scalar echo round-trips (simulated server echoes the REQUTEXT)', () => {
    const req = buildRfcSoapEnvelope('STFC_CONNECTION', { REQUTEXT: 'abc' });
    // Simulated response echoes the REQUTEXT → ECHOTEXT verbatim
    const echoed = req
      .replace('<urn:STFC_CONNECTION ', '<rfc:STFC_CONNECTION.Response ')
      .replace('urn:sap-com', 'urn:sap-com') // noop
      .replace('<REQUTEXT>', '<ECHOTEXT>')
      .replace('</REQUTEXT>', '</ECHOTEXT>')
      .replace('</urn:STFC_CONNECTION>', '</rfc:STFC_CONNECTION.Response>')
      .replace('xmlns:urn=', 'xmlns:rfc=');
    const out = parseRfcSoapResponse(echoed);
    expect(out.ECHOTEXT).toBe('abc');
  });
});

describe('createRfcClient', () => {
  it('sends a POST to /sap/bc/soap/rfc with SOAP body and parses the response', async () => {
    const calls: Array<{
      url: string;
      method: string;
      body?: string;
      headers?: Record<string, string>;
    }> = [];
    const client = createRfcClient({
      fetch: async (url, opts) => {
        calls.push({
          url,
          method: opts.method,
          body: opts.body,
          headers: opts.headers,
        });
        return `<?xml version="1.0"?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Body>
    <rfc:STFC_CONNECTION.Response xmlns:rfc="urn:sap-com:document:sap:rfc:functions">
      <ECHOTEXT>hello</ECHOTEXT>
      <RESPTEXT>ok</RESPTEXT>
    </rfc:STFC_CONNECTION.Response>
  </soap-env:Body>
</soap-env:Envelope>`;
      },
    });

    const out = await client.call('STFC_CONNECTION', { REQUTEXT: 'hello' });
    expect(out).toEqual({ ECHOTEXT: 'hello', RESPTEXT: 'ok' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/sap/bc/soap/rfc');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers?.['Content-Type']).toContain('text/xml');
    expect(calls[0].body).toContain('<REQUTEXT>hello</REQUTEXT>');
  });

  it('appends sap-client when provided', async () => {
    let capturedUrl = '';
    const client = createRfcClient({
      client: '100',
      fetch: async (url) => {
        capturedUrl = url;
        return '<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/"><soap-env:Body><rfc:FMResponse xmlns:rfc="urn:sap-com:document:sap:rfc:functions"/></soap-env:Body></soap-env:Envelope>';
      },
    });
    await client.call('FM');
    expect(capturedUrl).toBe('/sap/bc/soap/rfc?sap-client=100');
  });

  it('maps 404 fetch errors to RfcTransportUnavailable', async () => {
    const client = createRfcClient({
      fetch: async () => {
        throw new Error('Request failed with status 404 Not Found');
      },
    });
    await expect(client.call('STFC_CONNECTION')).rejects.toBeInstanceOf(
      RfcTransportUnavailable,
    );
  });
});
