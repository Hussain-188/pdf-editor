#!/bin/bash
# Build and run the PDF Engine Proof of Concept

JAVA_HOME="${JAVA_HOME:-C:/Program Files/Eclipse Adoptium/jdk-21.0.6.7-hotspot}"
JAVAC="$JAVA_HOME/bin/javac"
JAVA="$JAVA_HOME/bin/java"
CP="lib/pdfbox-3.0.3.jar;lib/fontbox-3.0.3.jar;lib/pdfbox-io-3.0.3.jar;lib/commons-logging-1.3.1.jar"

echo "Compiling..."
mkdir -p target/classes
"$JAVAC" -cp "$CP" -d target/classes $(find src/main/java -name "*.java")

if [ $? -ne 0 ]; then
    echo "Compilation failed!"
    exit 1
fi

echo "Running..."
"$JAVA" -cp "target/classes;$CP" com.pdfplatform.poc.PdfEditorPoc "$@"
