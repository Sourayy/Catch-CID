import torch
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
import numpy as np
import pandas as pd
from waitress import serve
from flask import Flask, request, jsonify
from flask_cors import CORS


# ==============================================
# Sistema de Recomendação Semântica de Doenças
# Entrada: Sintoma (texto)
# Saída: Doença mais semelhante (Descrição)
# ==============================================

#torch==2.7.1, Flask==2.2.5, sentence-transformers==4.1.0, waitress==3.0.2, pandas==2.3.0

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(device)

file_path = "cids_completos.csv"
df = pd.read_csv(file_path, sep=";", encoding="utf-8", engine="python")

df["Sintomas"] = df["Sintomas"].fillna("")
df["Descricao"] = df["Descricao"].fillna("")

model = SentenceTransformer("all-MiniLM-L6-v2").to(device) #all-mpnet-base-v2 all-distilroberta-v1

embeddings_base = model.encode(df["Sintomas"].tolist())

def buscar_doenca_por_sintoma(texto_usuario, metodo="cosine"):
    """
    metodo: "cosine" ou "euclidean"
    """
    emb_usuario = model.encode([texto_usuario])

    if metodo == "cosine":
        similaridades = cosine_similarity(emb_usuario, embeddings_base)[0]
        idx = np.argmax(similaridades)
        score = similaridades[idx]
    else:
        distancias = euclidean_distances(emb_usuario, embeddings_base)[0]
        idx = np.argmin(distancias)
        score = 1 / (1 + distancias[idx])  # transforma distância em score

    return {
        "Sintoma informado": texto_usuario,
        "Doença mais semelhante": df.loc[idx, "Descricao"],
        "Código CID": df.loc[idx, "Codigo"],
        "Similaridade": round(float(score), 3)
    }



app = Flask(__name__)
CORS(app)


@app.route('/inferir', methods=['GET', 'POST'])
def inferir():
    if request.method == 'POST':
        dados = request.get_json()
        consulta = dados.get("consulta", "")
    else:
        consulta = request.args.get("consulta", "vazio")

    resultado = buscar_doenca_por_sintoma(consulta, metodo="cosine")    
    return jsonify(resultado)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000) # test server
    #app.run(debug=True) # server linux
    #serve(app, host="0.0.0.0", port=5000) # server windows

