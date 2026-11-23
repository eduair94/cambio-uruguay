// El intermedio de www.uruguayemprendedor.uy, embebido porque su servidor no lo manda: la cadena es
// hoja (*.uruguayemprendedor.uy) <- "Abitab SSL Domain Validated" <- "Certum Global Services CA
// SHA2" <- "Certum Trusted Network CA", y sólo se sirve la hoja. Node falla con
// UNABLE_TO_VERIFY_LEAF_SIGNATURE (medido el 23/11/2026) y curl no, porque curl trae lo suyo.
//
// Es el mismo problema que bcu.gub.uy (classes/bcurates/certs.ts) con el intermedio hermano: el
// de "Certum Global Services CA SHA2" se reusa de ahí. Este se bajó de la URL de CA Issuers del
// propio certificado (http://repository.certum.pl/abitabdv.cer). Se SUMA al almacén de raíces de
// Node, nunca lo reemplaza: la cadena tiene que terminar en una raíz de confianza igual.
//
// Vence el 2027-05-02, igual que el de BCU; `tests/emprendimientos/certs.test.ts` avisa antes.
export const ABITAB_DV_INTERMEDIATE = `
-----BEGIN CERTIFICATE-----
MIIEujCCA6KgAwIBAgIQEB1CIlXh/kGGZmDEgBd2ETANBgkqhkiG9w0BAQsFADCB
gzELMAkGA1UEBhMCUEwxIjAgBgNVBAoTGVVuaXpldG8gVGVjaG5vbG9naWVzIFMu
QS4xJzAlBgNVBAsTHkNlcnR1bSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTEnMCUG
A1UEAxMeQ2VydHVtIEdsb2JhbCBTZXJ2aWNlcyBDQSBTSEEyMB4XDTE4MDgyMjA3
MDk1MloXDTI3MDUwMjA3MDk1MlowXTELMAkGA1UEBhMCVVkxFDASBgNVBAoMC0Fi
aXRhYiBTLkEuMRIwEAYDVQQLDAlJRGRpZ2l0YWwxJDAiBgNVBAMMG0FiaXRhYiBT
U0wgRG9tYWluIFZhbGlkYXRlZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC
ggEBAMPvaTRvcO1CAI0wFpjXVwe4nox1aeI0jU6KIzA/nHeqAdYPxB6ta+F0On1y
taiptSMvPMXXOqC8bfvW1tOvJ5jsQ0xRr95vzCXopMzvxbXsaK309BOM65FEPH92
f7SxNXItf+/RFy2CJCPPVeYLtf/Vuq0VA4yAWaX0ppjI6iJ7M0Ohfp5jJDASkdgJ
cQAAwBO5DNQpFsgAum58CFnqjneo4LYKdcRmX5vtqcYFvIjx1DOGjvgGpUqO3s7K
p93N3jKgKQx/qQbTrcoXpuG5b6+3tHzGQc/CadmJI7i3jPgA7uKzyLT5wR3/A61O
8umCGY/lqfYDfDaqz58p+PZQXDMCAwEAAaOCAU0wggFJMBIGA1UdEwEB/wQIMAYB
Af8CAQAwHQYDVR0OBBYEFG9AQhsv6QZraCJLC1KBNEodjrN2MB8GA1UdIwQYMBaA
FFSZ3Zv/6KcOoxmdW75CV98w/I8yMA4GA1UdDwEB/wQEAwIBBjA4BgNVHR8EMTAv
MC2gK6AphidodHRwOi8vc3ViY2EuY3JsLmNlcnR1bS5wbC9nc2Nhc2hhMi5jcmww
bgYIKwYBBQUHAQEEYjBgMCgGCCsGAQUFBzABhhxodHRwOi8vc3ViY2Eub2NzcC1j
ZXJ0dW0uY29tMDQGCCsGAQUFBzAChihodHRwOi8vcmVwb3NpdG9yeS5jZXJ0dW0u
cGwvZ3NjYXNoYTIuY2VyMDkGA1UdIAQyMDAwLgYEVR0gADAmMCQGCCsGAQUFBwIB
FhhodHRwOi8vd3d3LmNlcnR1bS5wbC9DUFMwDQYJKoZIhvcNAQELBQADggEBAIiV
b6WfzIFb8MHGajFP1cSxSZVqcA9t2pgKxGUgRolu8vfanxOLsSJPKSfM+cIzSLv/
GS3KDUVxjURP3tUQGpx5WbUIboN08F8VYw/6cmmjxmuZyKihYAv83LwGCS9CDfZ4
mC4+PnoY8sYrUjxn1vZRSSZRrUO+2s33BGuLiYiXnULWeM3J8OCEOVNjvPy3yJbr
ARp2lKHshD/T0RqlHAh904RF4+V8wF23igJEGL9rxviOIqQbSaaibmU026Ie9CHK
fEakGKhu2VaL/ezUTI2eJYtuz+ZtIQY+wqISkGfcJ5mdXSR/9omIK89eo+vqPWqT
awustbKQ2UaxlYhsG1I=
-----END CERTIFICATE-----
`;

export const ABITAB_DV_EXPIRES = "2027-05-02T07:09:52Z";
