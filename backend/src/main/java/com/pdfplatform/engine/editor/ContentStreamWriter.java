package com.pdfplatform.engine.editor;

import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.*;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Serializes a list of PDF content stream tokens back into valid content stream bytes.
 * Handles proper formatting of all COS object types and operators.
 */
public class ContentStreamWriter {

    private final OutputStream output;

    public ContentStreamWriter(OutputStream output) {
        this.output = output;
    }

    public void writeTokens(List<Object> tokens) throws IOException {
        for (int i = 0; i < tokens.size(); i++) {
            Object token = tokens.get(i);

            if (token instanceof Operator op) {
                writeOperator(op);
            } else if (token instanceof COSBase cosBase) {
                writeCOSBase(cosBase);
            }

            // Add space separator between tokens (but not after last token)
            if (i < tokens.size() - 1) {
                Object next = tokens.get(i + 1);
                if (!(token instanceof Operator) || !(next instanceof Operator)) {
                    output.write(' ');
                }
            }
        }
    }

    private void writeOperator(Operator op) throws IOException {
        String name = op.getName();
        output.write(name.getBytes(StandardCharsets.US_ASCII));
        output.write('\n');

        if ("BI".equals(name)) {
            COSDictionary params = op.getImageParameters();
            if (params != null) {
                for (COSName key : params.keySet()) {
                    output.write('/');
                    output.write(key.getName().getBytes(StandardCharsets.US_ASCII));
                    output.write(' ');
                    writeCOSBase(params.getDictionaryObject(key));
                    output.write('\n');
                }
            }
            output.write("ID\n".getBytes(StandardCharsets.US_ASCII));
            byte[] imageData = op.getImageData();
            if (imageData != null) {
                output.write(imageData);
            }
            output.write("\nEI\n".getBytes(StandardCharsets.US_ASCII));
        }
    }

    private void writeCOSBase(COSBase cos) throws IOException {
        if (cos instanceof COSString cosString) {
            writeCOSString(cosString);
        } else if (cos instanceof COSFloat cosFloat) {
            writeNumber(cosFloat.floatValue());
        } else if (cos instanceof COSInteger cosInt) {
            output.write(String.valueOf(cosInt.intValue()).getBytes(StandardCharsets.US_ASCII));
        } else if (cos instanceof COSNumber cosNum) {
            writeNumber(cosNum.floatValue());
        } else if (cos instanceof COSName cosName) {
            output.write('/');
            output.write(cosName.getName().getBytes(StandardCharsets.US_ASCII));
        } else if (cos instanceof COSArray cosArray) {
            writeCOSArray(cosArray);
        } else if (cos instanceof COSBoolean cosBool) {
            output.write(cosBool.getValue() ? "true".getBytes() : "false".getBytes());
        } else if (cos instanceof COSNull) {
            output.write("null".getBytes(StandardCharsets.US_ASCII));
        }
    }

    private void writeCOSString(COSString cosString) throws IOException {
        byte[] bytes = cosString.getBytes();

        // Check if hex encoding is needed (if bytes contain problematic characters)
        if (needsHexEncoding(bytes)) {
            output.write('<');
            for (byte b : bytes) {
                output.write(String.format("%02X", b & 0xFF).getBytes(StandardCharsets.US_ASCII));
            }
            output.write('>');
        } else {
            output.write('(');
            for (byte b : bytes) {
                int c = b & 0xFF;
                switch (c) {
                    case '(' -> output.write("\\(".getBytes());
                    case ')' -> output.write("\\)".getBytes());
                    case '\\' -> output.write("\\\\".getBytes());
                    case '\n' -> output.write("\\n".getBytes());
                    case '\r' -> output.write("\\r".getBytes());
                    case '\t' -> output.write("\\t".getBytes());
                    default -> {
                        if (c < 32 || c > 126) {
                            output.write(String.format("\\%03o", c).getBytes(StandardCharsets.US_ASCII));
                        } else {
                            output.write(c);
                        }
                    }
                }
            }
            output.write(')');
        }
    }

    private boolean needsHexEncoding(byte[] bytes) {
        // Use hex if there are many non-printable characters
        int nonPrintable = 0;
        for (byte b : bytes) {
            int c = b & 0xFF;
            if (c < 32 || c > 126) nonPrintable++;
        }
        return nonPrintable > bytes.length / 2;
    }

    private void writeCOSArray(COSArray array) throws IOException {
        output.write('[');
        for (int i = 0; i < array.size(); i++) {
            if (i > 0) output.write(' ');
            writeCOSBase(array.get(i));
        }
        output.write(']');
    }

    private void writeNumber(float value) throws IOException {
        // Format number: use integer format if it's a whole number
        if (value == (int) value) {
            output.write(String.valueOf((int) value).getBytes(StandardCharsets.US_ASCII));
        } else {
            // Limit decimal places to avoid floating point noise
            String formatted = String.format(java.util.Locale.US, "%.4f", value).replaceAll("0+$", "").replaceAll("\\.$", "");
            output.write(formatted.getBytes(StandardCharsets.US_ASCII));
        }
    }
}
