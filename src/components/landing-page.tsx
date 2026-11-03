"use client";

import Link from "next/link";
import { Trophy, TrendingUp, Users, Zap, ArrowRight } from "lucide-react";
import { getCurrentSeason } from "@/types/season";

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff5050]/10 via-[#5096ff]/10 to-[#dcff50]/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-full backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm text-zinc-300">Saison NBA {getCurrentSeason()} en cours</span>
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
              <span className="block text-white mb-2">Pronostiquez les matchs</span>
              <span className="block bg-gradient-to-r from-[#ff5050] via-[#5096ff] to-[#dcff50] bg-clip-text text-transparent">
                NBA comme un pro
              </span>
            </h1>

            {/* Description */}
            <p className="max-w-2xl mx-auto text-xl text-zinc-400 leading-relaxed">
              Affrontez vos amis, grimpez dans le classement et prouvez que vous
              connaissez la NBA mieux que personne.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/auth/register"
                className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#ff5050] to-[#ff5050]/80 hover:from-[#ff5050]/90 hover:to-[#ff5050]/70 text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#ff5050]/20 hover:shadow-[#ff5050]/40 hover:scale-105"
              >
                <span className="flex items-center justify-center gap-2">
                  Commencer gratuitement
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              <Link
                href="/matchs"
                className="w-full sm:w-auto px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all border border-zinc-700 hover:border-zinc-600"
              >
                Voir les matchs
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-[#ff5050] to-[#ff5050]/70 bg-clip-text text-transparent">Simple</div>
                <div className="text-sm text-zinc-500 mt-1">Interface intuitive</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-[#5096ff] to-[#5096ff]/70 bg-clip-text text-transparent">Rapide</div>
                <div className="text-sm text-zinc-500 mt-1">Pronos en 2 clics</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-[#dcff50] to-[#dcff50]/70 bg-clip-text text-transparent">Gratuit</div>
                <div className="text-sm text-zinc-500 mt-1">Toujours gratuit</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pourquoi choisir Yeye Pronos ?
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Une plateforme complète pour tous les fans de NBA qui veulent tester
              leurs connaissances
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-[#5096ff]/50 transition-all hover:shadow-lg hover:shadow-[#5096ff]/10">
              <div className="w-12 h-12 bg-[#5096ff]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-[#5096ff]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Compétitions
              </h3>
              <p className="text-zinc-400">
                Participez à des ligues privées avec vos amis ou affrontez la
                communauté
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-[#dcff50]/50 transition-all hover:shadow-lg hover:shadow-[#dcff50]/10">
              <div className="w-12 h-12 bg-[#dcff50]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-[#dcff50]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Classements en direct
              </h3>
              <p className="text-zinc-400">
                Suivez votre progression et celle de vos adversaires en temps réel
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-[#ff5050]/50 transition-all hover:shadow-lg hover:shadow-[#ff5050]/10">
              <div className="w-12 h-12 bg-[#ff5050]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-[#ff5050]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Ligues privées
              </h3>
              <p className="text-zinc-400">
                Créez vos propres ligues et invitez vos amis pour des défis exclusifs
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-[#5096ff]/50 transition-all hover:shadow-lg hover:shadow-[#5096ff]/10">
              <div className="w-12 h-12 bg-[#5096ff]/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-[#5096ff]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Scores en temps réel
              </h3>
              <p className="text-zinc-400">
                Recevez les scores instantanément et consultez vos résultats
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-24 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Classement général
            </h2>
            <p className="text-lg text-zinc-400">
              Les meilleurs pronostiqueurs de la communauté
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {/* Leaderboard Table */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Rang
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Joueur
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Pronos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {/* Mock data - sera remplacé par de vraies données */}
                    {[
                      { rank: 1, name: "Rejoignez", points: 0, predictions: 0 },
                      { rank: 2, name: "la", points: 0, predictions: 0 },
                      { rank: 3, name: "communauté", points: 0, predictions: 0 },
                      { rank: 4, name: "pour", points: 0, predictions: 0 },
                      { rank: 5, name: "apparaître", points: 0, predictions: 0 },
                      { rank: 6, name: "dans", points: 0, predictions: 0 },
                      { rank: 7, name: "ce", points: 0, predictions: 0 },
                      { rank: 8, name: "classement", points: 0, predictions: 0 },
                      { rank: 9, name: "!", points: 0, predictions: 0 },
                      { rank: 10, name: "🏀", points: 0, predictions: 0 },
                    ].map((player) => (
                      <tr
                        key={player.rank}
                        className="hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {player.rank <= 3 ? (
                              <span
                                className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                  player.rank === 1
                                    ? "bg-yellow-500/20 text-yellow-500"
                                    : player.rank === 2
                                    ? "bg-zinc-400/20 text-zinc-400"
                                    : "bg-orange-600/20 text-orange-600"
                                }`}
                              >
                                {player.rank}
                              </span>
                            ) : (
                              <span className="flex items-center justify-center w-8 h-8 text-zinc-400 font-semibold">
                                {player.rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {player.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-bold text-white">
                            {player.points}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm text-zinc-400">
                            {player.predictions}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* View Full Leaderboard Link */}
            <div className="text-center mt-8">
              <Link
                href="/classement"
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all border border-zinc-700 hover:border-zinc-600"
              >
                Voir le classement complet
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-zinc-400">
              Trois étapes simples pour commencer à pronostiquer
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#ff5050] to-[#ff5050]/50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                  1
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Inscrivez-vous
                </h3>
                <p className="text-zinc-400">
                  Créez votre compte gratuitement en quelques secondes avec Google
                  ou par email
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#5096ff] to-[#5096ff]/50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                  2
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Pronostiquez
                </h3>
                <p className="text-zinc-400">
                  Choisissez vos vainqueurs avant le début de chaque match et
                  validez vos pronos
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="text-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-[#dcff50] to-[#dcff50]/50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                  3
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Gagnez des points
                </h3>
                <p className="text-zinc-400">
                  Cumulez des points à chaque bon pronostic et grimpez dans le
                  classement
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="p-12 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700 rounded-3xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff5050]/5 via-[#5096ff]/5 to-[#dcff50]/5" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Prêt à montrer vos talents ?
              </h2>
              <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
                Rejoignez la communauté des pronostiqueurs NBA et prouvez que vous
                connaissez le basket mieux que personne.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#ff5050] to-[#ff5050]/80 hover:from-[#ff5050]/90 hover:to-[#ff5050]/70 text-white font-semibold rounded-xl transition-all shadow-lg hover:scale-105"
                >
                  Créer mon compte
                </Link>

                <Link
                  href="/auth/login"
                  className="w-full sm:w-auto px-8 py-4 bg-transparent hover:bg-zinc-800 text-white font-semibold rounded-xl transition-all border border-zinc-600 hover:border-zinc-500"
                >
                  Se connecter
                </Link>
              </div>

              <p className="text-sm text-zinc-500 mt-6">
                Aucune carte bancaire requise • 100% gratuit
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
