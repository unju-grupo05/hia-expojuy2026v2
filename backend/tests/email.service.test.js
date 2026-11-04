const { escapeHtml } = require('../src/services/email.service');

describe('escapeHtml', () => {
    it('neutraliza una etiqueta <script> completa', () => {
        const entrada = '<script>alert("xss")</script>';

        const resultado = escapeHtml(entrada);

        expect(resultado).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(resultado).not.toContain('<script>');
    });

    it('escapa el ampersand antes que el resto de entidades', () => {
        // Si el & se escapara despues, produziria &amp;lt; en vez de &lt;.
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });

    it('escapa los angle brackets', () => {
        expect(escapeHtml('<b>')).toBe('&lt;b&gt;');
        expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('escapa comillas dobles y simples', () => {
        expect(escapeHtml('"citado"')).toBe('&quot;citado&quot;');
        expect(escapeHtml("it's")).toBe('it&#039;s');
    });

    it('escapa el payload completo de un atributo malicioso', () => {
        const entrada = '" onerror="alert(1)';

        expect(escapeHtml(entrada)).toBe('&quot; onerror=&quot;alert(1)');
    });

    it('convierte null y undefined en cadena vacia', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    it('convierte numeros y booleanos a texto escapado', () => {
        expect(escapeHtml(0)).toBe('0');
        expect(escapeHtml(false)).toBe('false');
    });

    it('deja intacto el texto sin caracteres especiales', () => {
        expect(escapeHtml('ExpoJuy 2026')).toBe('ExpoJuy 2026');
    });
});
