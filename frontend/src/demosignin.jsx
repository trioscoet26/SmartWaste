import { useSignIn } from "@clerk/clerk-react";

const DemoSignIn = () => {
  const { signIn, isLoaded } = useSignIn();

  const handleDemoLogin = async () => {
    if (!isLoaded) return;

    try {
      await signIn.create({
        identifier: "trioscoet26@gmail.com",
        password: "12345678",
      });
      await signIn.authenticateWithRedirect();
    } catch (err) {
      console.error("Demo sign-in failed:", err);
    }
  };

  return (
    <button
      onClick={handleDemoLogin}
      className="bg-[#1e8449] text-white px-4 py-2 rounded-lg shadow-md hover:bg-[#166534] active:shadow-lg transition"
    >
      Use Demo Account
    </button>
  );
};

export default DemoSignIn;
