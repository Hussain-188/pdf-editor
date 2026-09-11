package com.pdfplatform.document.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pdfplatform.document.dto.EditRequest;
import com.pdfplatform.document.dto.EditResult;
import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.entity.DocumentOperation;
import com.pdfplatform.document.repository.DocumentOperationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class OperationService {

    private final DocumentOperationRepository operationRepository;
    private final DocumentEditService documentEditService;
    private final ObjectMapper objectMapper;

    public OperationService(DocumentOperationRepository operationRepository,
                            DocumentEditService documentEditService,
                            ObjectMapper objectMapper) {
        this.operationRepository = operationRepository;
        this.documentEditService = documentEditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Document executeAndRecord(Document doc, EditRequest request) throws IOException {
        EditResult editResult = documentEditService.applyEdit(doc, request);

        int nextSeq = operationRepository.findMaxSequenceNumber(doc.getId()) + 1;

        DocumentOperation op = new DocumentOperation();
        op.setDocument(doc);
        op.setSequenceNumber(nextSeq);
        op.setOperationType(request.operation());
        op.setPageNumber(request.pageNumber());
        op.setTargetObjectId(request.textBlockId());
        op.setParameters(objectMapper.writeValueAsString(Map.of(
                "oldText", nullSafe(request.oldText()),
                "newText", nullSafe(request.newText()),
                "fontSize", request.fontSize() != null ? request.fontSize() : 0,
                "color", request.color() != null ? request.color() : new double[]{}
        )));
        op.setInverseParameters(objectMapper.writeValueAsString(Map.of(
                "oldText", nullSafe(request.newText()),
                "newText", nullSafe(request.oldText()),
                "fontSize", editResult.originalFontSize() != null ? editResult.originalFontSize() : 0,
                "color", editResult.originalColor() != null ? editResult.originalColor() : new double[]{}
        )));

        operationRepository.save(op);

        // Invalidate any previously undone operations so stale redo entries cannot be replayed
        operationRepository.deleteUndoneByDocumentId(doc.getId());

        return editResult.document();
    }

    @Transactional
    public Document undo(Document doc) throws IOException {
        List<DocumentOperation> undoable = operationRepository.findUndoable(doc.getId());
        if (undoable.isEmpty()) {
            throw new IllegalArgumentException("Nothing to undo");
        }

        DocumentOperation lastOp = undoable.get(0);
        Map<String, Object> inverse = objectMapper.readValue(lastOp.getInverseParameters(), Map.class);

        Double fontSize = inverse.get("fontSize") instanceof Number n && n.doubleValue() != 0
                ? n.doubleValue() : null;
        double[] color = null;
        if (inverse.get("color") instanceof List<?> colorList && !colorList.isEmpty()) {
            color = colorList.stream().mapToDouble(c -> ((Number) c).doubleValue()).toArray();
        }
        EditRequest undoRequest = new EditRequest(
                lastOp.getPageNumber(),
                lastOp.getTargetObjectId(),
                lastOp.getOperationType(),
                (String) inverse.get("oldText"),
                (String) inverse.get("newText"),
                fontSize, color
        );

        EditResult editResult = documentEditService.applyEdit(doc, undoRequest);
        lastOp.setUndone(true);
        operationRepository.save(lastOp);
        return editResult.document();
    }

    @Transactional
    public Document redo(Document doc) throws IOException {
        List<DocumentOperation> redoable = operationRepository.findRedoable(doc.getId());
        if (redoable.isEmpty()) {
            throw new IllegalArgumentException("Nothing to redo");
        }

        DocumentOperation nextOp = redoable.get(0);
        Map<String, Object> params = objectMapper.readValue(nextOp.getParameters(), Map.class);

        Double redoFontSize = params.get("fontSize") instanceof Number n && n.doubleValue() != 0
                ? n.doubleValue() : null;
        double[] redoColor = null;
        if (params.get("color") instanceof List<?> colorList && !colorList.isEmpty()) {
            redoColor = colorList.stream().mapToDouble(c -> ((Number) c).doubleValue()).toArray();
        }
        EditRequest redoRequest = new EditRequest(
                nextOp.getPageNumber(),
                nextOp.getTargetObjectId(),
                nextOp.getOperationType(),
                (String) params.get("oldText"),
                (String) params.get("newText"),
                redoFontSize, redoColor
        );

        EditResult editResult = documentEditService.applyEdit(doc, redoRequest);
        nextOp.setUndone(false);
        operationRepository.save(nextOp);
        return editResult.document();
    }

    public List<DocumentOperation> getHistory(java.util.UUID documentId) {
        return operationRepository.findByDocumentId(documentId);
    }

    private String nullSafe(String s) {
        return s != null ? s : "";
    }
}
