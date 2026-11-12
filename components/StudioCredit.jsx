/** The studio credit, identical on every Quentin.Code site; the UTM source names this site. */
const STUDIO_URL = 'https://www.quentin.software/?utm_source=what-is-love&utm_medium=studio-credit'

export default function StudioCredit() {
  return (
    <>
      Built by Moshe Malka at <a href={STUDIO_URL}>Quentin.Code</a> ·{' '}
      <a href={`${STUDIO_URL}#contact`}>Work with me</a>
    </>
  )
}
