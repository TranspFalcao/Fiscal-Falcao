const arquivosCSV = ['Plan1.csv', 'Plan2.csv'];
const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

document.addEventListener('DOMContentLoaded', () => {
    carregarDadosCSV();
    document.getElementById('exportPDF').addEventListener('click', exportarPDF);
});

function carregarDadosCSV() {
    let dadosPorAno = {};
    let todasLinhas = [];

    let promises = arquivosCSV.map(arquivo => fetch(arquivo).then(res => res.text()).then(texto => {
        return new Promise(resolve => {
            Papa.parse(texto, {
                header: true,
                complete: results => {
                    results.data.forEach(row => {
                        if(row['ANO'] && row['UF'] && row['MÊS'] && row['VALOR']) {
                            const ano = row['ANO'];
                            const uf = row['UF'];
                            const mes = row['MÊS'];
                            const valor = parseFloat(row['VALOR']) || 0;

                            if(!dadosPorAno[ano]) dadosPorAno[ano] = {};
                            if(!dadosPorAno[ano][uf]) dadosPorAno[ano][uf] = Array(12).fill(0);

                            const indexMes = meses.indexOf(mes);
                            if(indexMes >= 0) dadosPorAno[ano][uf][indexMes] += valor;

                            todasLinhas.push(row);
                        }
                    });
                    resolve();
                }
            });
        });
    }));

    Promise.all(promises).then(() => {
        atualizarTabela(todasLinhas);
        atualizarGraficos(dadosPorAno);
    });
}

function atualizarTabela(linhas) {
    const tabela = document.getElementById('tabelaImpostos');
    tabela.innerHTML = '<tr><th>UF</th><th>MÊS</th><th>ANO</th><th>VALOR</th></tr>';
    linhas.forEach(row => {
        tabela.innerHTML += `<tr><td>${row['UF']}</td><td>${row['MÊS']}</td><td>${row['ANO']}</td><td>${row['VALOR']}</td></tr>`;
    });
}

function atualizarGraficos(dadosPorAno) {
    const anos = Object.keys(dadosPorAno);
    const buttonsDiv = document.getElementById('year-buttons');
    buttonsDiv.innerHTML = '';
    anos.forEach(ano => {
        const btn = document.createElement('button');
        btn.textContent = ano;
        btn.onclick = () => plotarGraficos(ano, dadosPorAno);
        buttonsDiv.appendChild(btn);
    });
    if(anos.length > 0) plotarGraficos(anos[0], dadosPorAno);
}

function plotarGraficos(ano, dadosPorAno) {
    const traces = [];
    for(const uf in dadosPorAno[ano]) {
        traces.push({ x: meses, y: dadosPorAno[ano][uf], mode: 'lines+markers', name: uf });
    }
    Plotly.newPlot('graficoLinha', traces, { title: `Evolução Mensal - ${ano}`, template: 'plotly_dark' });

    const ufList = Object.keys(dadosPorAno[ano]);
    const valores = ufList.map(uf => dadosPorAno[ano][uf].reduce((a,b)=>a+b,0));
    Plotly.newPlot('graficoBarra', [{ x: ufList, y: valores, type: 'bar', marker:{color:'red'} }], { title: `Saldo Total por UF - ${ano}`, template: 'plotly_dark' });
}

function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Relatório de Impostos', 10, 10);
    const tabela = document.getElementById('tabelaImpostos');
    let y = 20;
    for(let row of tabela.rows) {
        let linhaTexto = '';
        for(let cell of row.cells) {
            linhaTexto += cell.innerText + ' | ';
        }
        doc.text(linhaTexto, 10, y);
        y += 10;
    }
    doc.save('relatorio_impostos.pdf');
}
