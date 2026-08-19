// Intermediate certificates for www.bcu.gub.uy, bundled because the BCU's server does not send
// them. Its TLS chain is leaf (*.bcu.gub.uy) <- "Abitab SSL Organization Validated" <- "Certum
// Global Services CA SHA2" <- "Certum Trusted Network CA", and only the leaf is served. Node
// therefore fails with "unable to verify the first certificate" — verified on both a dev machine
// and the production VPS — while curl succeeds, because curl ships its own bundle.
//
// These two intermediates are public and were fetched from the CA Issuers URLs in each
// certificate's own Authority Information Access extension:
//   http://repository.certum.pl/abitabov.cer
//   http://repository.certum.pl/gscasha2.cer
//
// They are ADDED to Node's root store, never replacing it, so verification stays real: the chain
// still has to terminate in a trusted root. The alternative — rejectUnauthorized: false — would
// have silently disabled that, which is not acceptable for a job whose output is a number this
// site tells people they will be charged.
//
// The Abitab intermediate expires 2027-05-02. When it rotates, the fetch starts failing and the
// job keeps serving the previous table while logging the error; refresh this file from the AIA
// URLs above. `tests/bcurates/certs.test.ts` fails ahead of the expiry so it is not a surprise.
// Embedded as TypeScript rather than shipped as a .pem next to this file because `tsc` copies
// only compiled sources into dist/: a data file here would simply not exist in production, and
// the job would fail on every run with ENOENT instead of fetching anything.

export const BCU_CERT_CHAIN = `-----BEGIN CERTIFICATE-----
MIIEwTCCA6mgAwIBAgIRAPDVlBXG3stPiI8oN+YGgQ8wDQYJKoZIhvcNAQELBQAw
gYMxCzAJBgNVBAYTAlBMMSIwIAYDVQQKExlVbml6ZXRvIFRlY2hub2xvZ2llcyBT
LkEuMScwJQYDVQQLEx5DZXJ0dW0gQ2VydGlmaWNhdGlvbiBBdXRob3JpdHkxJzAl
BgNVBAMTHkNlcnR1bSBHbG9iYWwgU2VydmljZXMgQ0EgU0hBMjAeFw0xODA4MjIw
NzEwNTlaFw0yNzA1MDIwNzEwNTlaMGMxCzAJBgNVBAYTAlVZMRQwEgYDVQQKDAtB
Yml0YWIgUy5BLjESMBAGA1UECwwJSURkaWdpdGFsMSowKAYDVQQDDCFBYml0YWIg
U1NMIE9yZ2FuaXphdGlvbiBWYWxpZGF0ZWQwggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQDRHpKZ1x9MN92GPEzBHOreEaFKQ970cb0DwzwZ9BIFvL39UnNp
CA88BKRI7xUsOso3IiNrikyYvXOdW8VOlYn4nR819ocdmFlDi4fsTUXhPy957jb7
m5HK+AQI5V0G+VQE3Z1KbuUJD5NCpAsWB9917LIQ5+n296wZrGxvKDaJZftxNgBM
UYlAWNnc88R/jFNVcKY3y4VJCEzLMx68K9p1fbV4mpCafXvEgzWzQlpW3/xkBicg
DwoFoL/fkUq89q3kLfJy9IoJJdfD7DtZ+NTe/sOLU64xpyqIkmH/F7zBuGQZ76TQ
rpCI0EWUOKzAk4RJINBE6xjLhdYS/XKTTiYZAgMBAAGjggFNMIIBSTASBgNVHRMB
Af8ECDAGAQH/AgEAMB0GA1UdDgQWBBSGC3U4ncuDuHEGDR9d6I7U6J6QZjAfBgNV
HSMEGDAWgBRUmd2b/+inDqMZnVu+QlffMPyPMjAOBgNVHQ8BAf8EBAMCAQYwOAYD
VR0fBDEwLzAtoCugKYYnaHR0cDovL3N1YmNhLmNybC5jZXJ0dW0ucGwvZ3NjYXNo
YTIuY3JsMG4GCCsGAQUFBwEBBGIwYDAoBggrBgEFBQcwAYYcaHR0cDovL3N1YmNh
Lm9jc3AtY2VydHVtLmNvbTA0BggrBgEFBQcwAoYoaHR0cDovL3JlcG9zaXRvcnku
Y2VydHVtLnBsL2dzY2FzaGEyLmNlcjA5BgNVHSAEMjAwMC4GBFUdIAAwJjAkBggr
BgEFBQcCARYYaHR0cDovL3d3dy5jZXJ0dW0ucGwvQ1BTMA0GCSqGSIb3DQEBCwUA
A4IBAQAiBThwLiKG2RvYPpph0ftYNFf7SaoVQJKWTmYGP7NkGpevtWQS9QkYKPtd
HAm9cPzKA/Las/WrwXin3zXzUUGuPttSSxCI4D9sRTX2RHAUSRBLrFXV/BCjtjlS
ehODXP2CXJsQtQ6SNvDaz4w8iSnrKhJyLgCIW/Q/u6dfkktQxEq+FJ4fWRC+Z8DY
1llk6g6FWBMuLVclLnUzQ0BplhJKUBLA7pd86VsJZStGWcRtW9iaMwsn4QnnLZ0B
h2wLKEzze5KwoLPuY2tm0SHWubPO11HJhoMJ6k+QgJG1XObTBLofuJC1/NpHy72z
xrAnpFWbSDnEYkhrXDMGxTSDdkAv
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIEzTCCA7WgAwIBAgIRANBLb+XdW9Ih58dM9kaLMUYwDQYJKoZIhvcNAQELBQAw
fjELMAkGA1UEBhMCUEwxIjAgBgNVBAoTGVVuaXpldG8gVGVjaG5vbG9naWVzIFMu
QS4xJzAlBgNVBAsTHkNlcnR1bSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTEiMCAG
A1UEAxMZQ2VydHVtIFRydXN0ZWQgTmV0d29yayBDQTAeFw0xNDA5MTExMjAwMDBa
Fw0yNzA2MDkxMDQ2MzlaMIGDMQswCQYDVQQGEwJQTDEiMCAGA1UEChMZVW5pemV0
byBUZWNobm9sb2dpZXMgUy5BLjEnMCUGA1UECxMeQ2VydHVtIENlcnRpZmljYXRp
b24gQXV0aG9yaXR5MScwJQYDVQQDEx5DZXJ0dW0gR2xvYmFsIFNlcnZpY2VzIENB
IFNIQTIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDHhvLXeA4kyBVY
Dr12JusjW+/HPPWpBmWnSZC9gadbNXCD/GlHrGruRWrKn0YBasbonXi5FLRon717
aCCDt2+7URnJx4mLGt3X73yH3I+T+COuyTFOuLId68jYV4vfBm1N/N1/KohGr8+R
7eT4f4agfXVQ+gDZT3pGTywqc9IId4uHaFjW+mr5vVfu7WjL8A20jOawvlqV2K4/
qSrjPZsqHlzf46LHgbQEK1EjTPsFrfvAQxvGpHiEIAFsS+1d2xPIEJVIxvq+KyGb
W/0SJIj7/SfYo+ItvJ2a4/G2JfoPF9wTCC0N8U5I/KXxjYYXBcIE9pQ16T24T+dr
MfPG2mYtAgMBAAGjggE+MIIBOjAPBgNVHRMBAf8EBTADAQH/MB0GA1UdDgQWBBRU
md2b/+inDqMZnVu+QlffMPyPMjAfBgNVHSMEGDAWgBQIds3LB/8k9sXN7buQvOKE
N0Z19zAOBgNVHQ8BAf8EBAMCAQYwLwYDVR0fBCgwJjAkoCKgIIYeaHR0cDovL2Ny
bC5jZXJ0dW0ucGwvY3RuY2EuY3JsMGsGCCsGAQUFBwEBBF8wXTAoBggrBgEFBQcw
AYYcaHR0cDovL3N1YmNhLm9jc3AtY2VydHVtLmNvbTAxBggrBgEFBQcwAoYlaHR0
cDovL3JlcG9zaXRvcnkuY2VydHVtLnBsL2N0bmNhLmNlcjA5BgNVHSAEMjAwMC4G
BFUdIAAwJjAkBggrBgEFBQcCARYYaHR0cDovL3d3dy5jZXJ0dW0ucGwvQ1BTMA0G
CSqGSIb3DQEBCwUAA4IBAQDRhC+yVHfF/IFcNNKbkxX1aVsCZ0fa2t+MxyFcs7KO
qW1fGpOOycughOFnbM+lz4Y3gt5RaOFJTm7YVUZZ3751s5tv8nhXeXfrRIpQN7Cu
+Nei457HlDxEUItPlkYnDbdDes/96T19cICd1TmIPekYRXiyuPW4Wgx6vykmk91x
LkJ0y74TzVtUofVF446qXvea95zNpzYCVMg+AOX3ZZyy9XfST6g4um+cw/Idv31d
bnJdBzMOgHH3uw2YMiZQgDqvNRE+wAs+PTFEIKHmBc/t1n3Shvg9e68M+5ZRM8bE
WGqgLqfreTgCsCQcv9MDYw9TFUbS17RdE6NtiPfszTky
-----END CERTIFICATE-----
`;
