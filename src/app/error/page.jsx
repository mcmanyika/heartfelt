export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-red-600 mb-2">Oops!</h1>
        <p className="text-gray-600 text-lg">Sorry, something went wrong</p>
      </div>
    </div>
  )
}