/**
 * Contagem com a palavra no plural certo.
 *
 * Em português o plural não é um sufixo que se cola no singular: "medição"
 * vira "medições", e não "mediçãoões". Concatenar o sufixo era o que a ficha
 * do paciente fazia, e o resultado aparecia na tela. Por isso as duas formas
 * entram inteiras.
 */
export function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}
