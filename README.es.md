# Visual Math

[English](README.md) · [简体中文](README.zh-CN.md) · Español

Escribe apuntes de **matemáticas, química y física en Obsidian** sin aprender LaTeX. Visual Math ofrece edición visual, código LaTeX y un modo Hybrid sincronizado. Las fórmulas se guardan como LaTeX/Markdown; funciona localmente, sin cuenta ni conexión.

## 0.8.2: nombre y autor

La próxima actualización de metadatos usa **Visual Math / Oliver**. El identificador sigue siendo `visual-math-editor`. La búsqueda del catálogo se sincroniza por separado; consulta [TEST-REPORT.md](TEST-REPORT.md) para conocer el estado de publicación y verificación.

## 0.8.1: mantenimiento

Elimina una aserción de tipo innecesaria y una importación sin usar detectadas en 0.8.0. Ambos paquetes incluyen este README en español. Conserva las gráficas polares/XYZ y los formatos guardados. Consulta la [versión 0.8.1](https://github.com/oranipost/visual-math-editor/releases/tag/0.8.1) y el [informe de pruebas](TEST-REPORT.md) para conocer disponibilidad y verificaciones reales.

La versión 0.8.1 pasó 194 pruebas automatizadas y 368 comprobaciones de componentes. En macOS con Obsidian 1.14.4 se insertaron fórmulas y gráficas polares/XYZ, se guardaron las vistas y se reinició la aplicación. Al reabrir los editores se conservaron los rangos, los límites de theta y los ángulos. Es una prueba limitada de actualización manual, no de instalación desde el catálogo ni de otras plataformas.

## 0.8.0: beta pública para escritorio

Esta versión añade gráficas polares, cálculo numérico y superficies XYZ. **Han pasado 194 pruebas automatizadas y 368 comprobaciones de componentes en navegador. La inserción, el guardado y la reapertura en Obsidian nativo con 0.8.0 todavía no se han verificado.** Prueba primero en una bóveda desechable. Publicación en GitHub, revisión del directorio e instalación nativa son estados distintos; consulta [el informe de pruebas](TEST-REPORT.md).

[Versión 0.8.1 y descargas](https://github.com/oranipost/visual-math-editor/releases/tag/0.8.1) · [ZIP de instalación](https://github.com/oranipost/visual-math-editor/releases/download/0.8.1/visual-math-editor-0.8.1.zip) · [Directorio comunitario](https://community.obsidian.md/plugins/visual-math-editor)

Requiere **Obsidian 1.14.4 o posterior** y está dirigido a la ventana principal de escritorio. Windows, Linux, móvil, ventanas independientes y combinaciones arbitrarias de temas o complementos no están verificados. Las pruebas nativas anteriores conservan sus versiones originales; no validan automáticamente 0.8.0.

## Instalar y actualizar

1. Descarga el ZIP de instalación anterior, ya compilado. No necesitas Node.js. **Code → Download ZIP** descarga código que necesita compilación.
2. Extrae y copia la carpeta completa `visual-math-editor` en `.obsidian/plugins/` dentro de tu bóveda. `main.js`, `manifest.json`, `styles.css` y las licencias deben quedar directamente dentro, sin otra carpeta intermedia.
3. Reinicia Obsidian y activa **Visual Math** en **Settings → Community plugins**.
4. Abre una nota Markdown y pulsa **∑** en su cabecera o en la barra lateral.

Para actualizar manualmente, guarda los borradores, desactiva el complemento y respalda su carpeta. Sustituye los archivos del programa, **conserva tu `data.json`** y reinicia Obsidian. El identificador sigue siendo `visual-math-editor`, aunque antes se llamaba Visual Math Editor. Cuando el directorio ofrezca la actualización, utiliza **Check for updates → Update**. Consulta [instalación](docs/INSTALLATION.md) y [actualizaciones](docs/UPDATING.md).

## Tu primera fórmula

En **Visual → Math**, pulsa **Fraction**, escribe `3`, avanza con **Tab** y escribe `4`. Añade raíces, exponentes, subíndices, integrales o sumatorios mediante sus botones. Elige fórmula en línea o independiente y pulsa **Insert equation**; **Ctrl+Enter** también confirma.

- **Visual:** modifica la fórmula ya compuesta mediante estructuras y casillas.
- **LaTeX:** escribe el código, sin los delimitadores exteriores `$` o `$$`.
- **Hybrid:** edita el código o la representación visual; ambos comparten el borrador y se sincronizan.

El panel aparece debajo del párrafo. Para volver a editar, coloca el cursor dentro de una fórmula y pulsa **∑**, o utiliza **Choose equation to edit**. **Cancel** conserva la nota. Puedes asignar un atajo desde **Settings → Hotkeys**.

## Gráficas, trigonometría y cálculo

Debajo de una fórmula compatible, pulsa **Graph this equation**: no hace falta volver a escribirla. Prueba `y=x^2`, cambia la fórmula y observa la vista previa. **Insert equation and graph** guarda ambos. Después del guardado son **bloques independientes**: modificar la fórmula guardada no actualiza automáticamente su gráfica. Regenera la gráfica o utiliza **Edit graph**.

Las herramientas avanzadas **Graph** incluyen:

- **Funciones:** `sin(x)`, `cos(x)`, `tan(x)`, raíces, potencias y logaritmos. La trigonometría usa radianes; `ln` es natural y `log`, decimal. Los botones de símbolos insertan en el cursor; los ejemplos sustituyen toda la expresión.
- **Polares:** `r=2*sin(3*theta)`, con θ de `0` a `6.283185307179586`. El intervalo debe ser creciente y no superar 100π radianes.
- **Cálculo:** con `y=x^2`, selecciona primera derivada, segunda derivada o integral definida. Entre `0` y `1`, la integral numérica es aproximadamente `0.333333333`, con sombreado.
- **XYZ:** `z=(x^2-y^2)/10`. Arrastra para girar y usa la rueda para ampliar. Los tres ejes se escalan independientemente; compara sus valores numéricos.
- **Plano complejo:** escribe `3+2i` para marcar Re = 3, Im = 2. Admite hasta 20 números, uno por línea.

**Save view** conserva explícitamente rangos y ángulos; navegar solamente no los guarda. Las definiciones permanecen en bloques `vme-plot`; desactivar el complemento deja los datos sin renderizar.

Son aproximaciones numéricas, **no álgebra simbólica**. No incluyen ecuaciones implícitas generales ni superficies paramétricas. La integración requiere una función continua y finita con límites crecientes; no admite integrales impropias. Las expresiones tienen un máximo de 500 caracteres y los ejes, límites de ±1 000 000. El muestreo puede omitir detalles. Más restricciones en [el README completo](README.md#graphs-and-the-complex-plane).

## Ciencias, idiomas y atajos

**Chemistry** admite subíndices, cargas, enlaces lineales y reacciones. Para `H2 + O2 -> H2O`, ofrece `2H2 + O2 -> 2H2O`; **Insert as written** permite conservar el original sin equilibrar. La comprobación no demuestra viabilidad química. **Physics** aporta vectores, letras griegas y plantillas. **Units** convierte unidades predefinidas sin conexión: `1 in = 2.54 cm`. **Elements** incluye 118 elementos; pasa el cursor o enfócalos para consultar masa y configuración electrónica.

La interfaz incluye **English, 简体中文 y Español**. **Usar el idioma de Obsidian** sigue su idioma; los no admitidos usan inglés. En **My formula shortcuts**, guarda palabras de 3–24 letras/números ASCII, comenzando por letra; hasta 50 por bóveda. Se expanden en el campo visual de Visual/Hybrid, no en texto ordinario ni código LaTeX.

## Privacidad, licencia y contacto

No hay telemetría ni vigilancia del portapapeles. El acceso al portapapeles responde a copiar, cortar o pegar voluntariamente.

Desde 0.7.0, el código nuevo y la distribución usan [GPLv3-only con una excepción limitada para Obsidian](LICENSING.md). Permite uso comercial conforme a GPL y exige el código fuente correspondiente al distribuir modificaciones cubiertas. No convierte tus notas en GPL. Los permisos MIT anteriores hasta 0.6.5 siguen vigentes; se conservan las [licencias de terceros](THIRD-PARTY-NOTICES.md).

Desarrollador: [Oliver / oranipost](https://github.com/oranipost). [Comunica problemas](https://github.com/oranipost/visual-math-editor/issues) indicando versiones, sistema y ejemplo mínimo, sin notas privadas. Contacto: [oranipost@outlook.com](mailto:oranipost@outlook.com).
