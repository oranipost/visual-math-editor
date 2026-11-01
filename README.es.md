# Visual Math

[English](README.md) · [简体中文](README.zh-CN.md) · Español

Escribe apuntes de **matemáticas, química y física en Obsidian** sin aprender LaTeX. Visual Math ofrece edición visual, código LaTeX y un modo Hybrid sincronizado. Las fórmulas se guardan como LaTeX/Markdown; funciona localmente, sin cuenta ni conexión.

## 1.0.0: más herramientas de notación

[Visual Math 1.0.0 · Versión de escritorio](https://github.com/oranipost/visual-math-editor/releases/tag/1.0.0) incorpora la importación revisada de una fórmula, matrices de 1–6 filas y columnas, sistemas de 2–6 filas con llave izquierda, nueve plantillas de matemáticas avanzadas y 19 herramientas de conjuntos y sucesiones. Añade siete modelos geométricos y tres escenas espaciales con parámetros ajustables, giro, zoom y guardado explícito de la vista.

Se mantiene **Visual Math / Oliver** y el identificador `visual-math-editor`. Se han eliminado las palabras clave de fórmulas para simplificar la interfaz; las fórmulas ya insertadas y los demás ajustes se conservan. Siguen disponibles Deshacer/Rehacer del borrador y la recuperación temporal. No hay biblioteca ni historial permanente de fórmulas.

[ZIP de instalación 1.0.0](https://github.com/oranipost/visual-math-editor/releases/download/1.0.0/visual-math-editor-1.0.0.zip) · [Notas y sumas de verificación](https://github.com/oranipost/visual-math-editor/releases/tag/1.0.0) · [Directorio comunitario](https://community.obsidian.md/plugins/visual-math-editor)

Requiere **Obsidian 1.14.4 o posterior**, en la ventana principal de escritorio. Windows, Linux, móvil, ventanas independientes y combinaciones arbitrarias de temas/complementos no están verificados. La publicación en GitHub, la revisión del directorio y las pruebas nativas son estados distintos: consulta [TEST-REPORT.md](TEST-REPORT.md) para la versión y el entorno realmente comprobados.

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

## Importar una fórmula

Elige **Import one equation** o pega en el campo visual para preparar la importación. Acepta contenido LaTeX sin envoltura o una única pareja completa de `$…$`, `$$…$$`, `\(...\)` o `\[...\]`. El texto original, el candidato y la intención de mostrarlo en línea o separado se presentan por separado.

Comprueba la vista previa; **Apply and replace equation** sustituye la fórmula completa del borrador. **Cancel import** vuelve sin aplicar. La nota solo cambia con la inserción o el guardado final. Deshacer/Rehacer permite recuperar el borrador anterior.

El código completo con macros no admitidas puede conservarse mediante **Save source**. Conservar código no equivale a admitirlo visualmente ni garantiza su representación en otro programa. No se eliminan comandos desconocidos, comentarios ni fragmentos, ni se reparan paréntesis o se adivina el significado matemático. Documentos, definiciones de macros, texto mezclado, archivos, OCR e importación por lotes quedan fuera del alcance.

Una importación admite hasta **8.192 unidades de código UTF-16** de entrada original, incluidos los delimitadores y los espacios exteriores. La representación visual tiene un límite independiente de **4.096 unidades de código UTF-16** para el contenido de la fórmula. Una fórmula válida más larga conserva todo su código, omite la vista previa visual y requiere aplicar explícitamente solo el código y después usar **Save source** en LaTeX/Hybrid. Se mantiene la validación de sintaxis; esto no equivale a edición visual completa. Al acortarla hasta el límite visual se recupera la edición visual si la notación es compatible. El contenido no se trunca. También se aplican límites de comandos y estructura; estar dentro de ellos no garantiza fluidez. Véanse las mediciones en [TEST-REPORT.md](TEST-REPORT.md).

## Matrices, sistemas, conjuntos y sucesiones

En **Math**, despliega la herramienta necesaria:

- **Matrix editor:** 1–6 filas y columnas, con varios delimitadores y celdas visuales. Vista previa e inserción/sustitución explícitas. Las celdas vacías no se completan solas; rellenarlas con cero es una acción separada.
- **System of equations:** 2–6 ecuaciones o desigualdades y una llave izquierda automática. No interpreta una función a trozos de dos columnas como un sistema ni calcula sus soluciones.
- **Sets and sequences:** 19 botones para conjuntos por enumeración o condición, ℕ/ℤ/ℚ/ℝ/ℂ, pertenencia, subconjuntos, unión, intersección y conjunto vacío; términos, llaves, sucesiones finitas y términos aritméticos/geométricos. Introduce las variables y condiciones; no calcula, ordena ni elimina duplicados.
- **Advanced math templates:** límites, derivadas ordinarias/de segundo orden/parciales, integrales dobles, series infinitas, productos, vectores y gradientes. Insertan notación editable, no peticiones de cálculo.
- **Símbolos:** seno, coseno, tangente, semejanza ∼, congruencia ≅, ángulo ∠, triángulo △ y ángulo recto editable 90°.

Las matrices y los sistemas usan borradores temporales separados. Vista previa y Cancel no cambian la fórmula principal. Aplicar cambia su borrador; el guardado final actualiza la nota. Las estructuras no admitidas o incompletas se conservan y bloquean el guardado ordinario.

## Modelos geométricos

Abre **Graph → Geometry**. Elige esfera, cilindro, cono, pirámide regular, prisma regular, ortoedro o plano. Las bases regulares admiten 3–12 lados; el radio va del centro a un vértice. Las tres escenas básicas muestran **dos planos**, **recta y plano** o **esfera y plano**, con parámetros ajustables y la línea, circunferencia o punto de tangencia correspondiente.

Arrastra para girar y usa la rueda o botones para ampliar. **Insert graph / Save graph** o **Save view** guardan dimensiones, caras, ángulos y zoom. Reabre el gráfico para editar sus parámetros. Se usa una proyección ortográfica con iguales unidades X/Y/Z; las curvas son aproximaciones poligonales y los parámetros tienen límites.

Son escenas didácticas fijas, no CAD, intersecciones arbitrarias de sólidos, geometría simbólica ni un constructor general de modelos. Se guardan en bloques `vme-plot` y requieren el complemento para renderizarse. Las versiones antiguas no muestran el modo geométrico; esta versión sigue leyendo los formatos anteriores.

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

## Ciencias e idiomas

**Chemistry** admite subíndices, cargas, enlaces lineales y reacciones. Para `H2 + O2 -> H2O`, ofrece `2H2 + O2 -> 2H2O`; **Insert as written** permite conservar el original sin equilibrar. La comprobación no demuestra viabilidad química. **Physics** aporta vectores, letras griegas y plantillas. **Units** convierte unidades predefinidas sin conexión: `1 in = 2.54 cm`. **Elements** incluye 118 elementos; pasa el cursor o enfócalos para consultar masa y configuración electrónica.

La interfaz incluye **English, 简体中文 y Español**. **Usar el idioma de Obsidian** elige una de estas traducciones; los idiomas no admitidos usan inglés. Cambiar el idioma no traduce ni modifica las fórmulas. En 1.0.0 no se crean ni expanden palabras clave de fórmulas; los datos antiguos no se utilizan ni se borran. Conserva `data.json` al actualizar. Los borradores temporales deben guardarse antes de reiniciar o desactivar el complemento.

## Privacidad, licencia y contacto

No hay telemetría ni vigilancia del portapapeles. El acceso al portapapeles responde a copiar, cortar o pegar voluntariamente.

Desde 0.7.0, el código nuevo y la distribución usan [GPLv3-only con una excepción limitada para Obsidian](LICENSING.md). Permite uso comercial conforme a GPL y exige el código fuente correspondiente al distribuir modificaciones cubiertas. No convierte tus notas en GPL. Los permisos MIT anteriores hasta 0.6.5 siguen vigentes; se conservan las [licencias de terceros](THIRD-PARTY-NOTICES.md).

Desarrollador: [Oliver / oranipost](https://github.com/oranipost). [Comunica problemas](https://github.com/oranipost/visual-math-editor/issues) indicando versiones, sistema y ejemplo mínimo, sin notas privadas. Contacto: [oranipost@outlook.com](mailto:oranipost@outlook.com).
