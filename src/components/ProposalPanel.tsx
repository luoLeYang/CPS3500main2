'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, ThumbsUp, ThumbsDown, MessageSquare, Edit2 } from 'lucide-react';

interface ProposalPanelProps {
  currentUser: any;
}

const PROPOSAL_TYPES = [
  { id: 'cleaning', label: 'Cleaning Schedule', icon: '🧹' },
  { id: 'visitor', label: 'Visitor Policy', icon: '👥' },
  { id: 'quiet-hours', label: 'Quiet Hours', icon: '🔕' }
];

export default function ProposalPanel({ currentUser }: ProposalPanelProps) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showVoteForm, setShowVoteForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [votes, setVotes] = useState<any[]>([]);
  const [customType, setCustomType] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'cleaning',
    content: {}
  });

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    content: {}
  });

  const [voteData, setVoteData] = useState({
    voteType: 'approve',
    comment: ''
  });

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedProposal) {
      fetchVotes(selectedProposal.id);
    }
  }, [selectedProposal]);

  const fetchProposals = async () => {
    try {
      const res = await fetch(`/api/proposals?status=active&userId=${currentUser.id}`);
      const data = await res.json();
      setProposals(data);
    } catch (error) {
      console.error('Failed to fetch proposals:', error);
    }
  };

  const fetchVotes = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/votes?proposalId=${proposalId}&userId=${currentUser.id}`);
      const data = await res.json();
      setVotes(data);
    } catch (error) {
      console.error('Failed to fetch votes:', error);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = formData.type === 'custom' ? customType.trim() : formData.type;
    if (!finalType) return;
    setLoading(true);

    try {
      const response = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: finalType,
          initiatorId: currentUser.id
        })
      });

      if (response.ok) {
        setFormData({ title: '', description: '', type: 'cleaning', content: {} });
        setCustomType('');
        setShowForm(false);
        fetchProposals();
      }
    } catch (error) {
      console.error('Failed to create proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;
    setLoading(true);

    try {
      const response = await fetch('/api/proposals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: selectedProposal.id,
          ...editData
        })
      });

      if (response.ok) {
        setShowEditForm(false);
        fetchProposals();
        setSelectedProposal({ ...selectedProposal, ...editData });
      }
    } catch (error) {
      console.error('Failed to edit proposal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;

    setLoading(true);
    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: selectedProposal.id,
          userId: currentUser.id,
          ...voteData
        })
      });

      if (response.ok) {
        setVoteData({ voteType: 'approve', comment: '' });
        setShowVoteForm(false);
        fetchProposals();
        fetchVotes(selectedProposal.id);
      }
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeInfo = (typeId: string) => {
    return PROPOSAL_TYPES.find(t => t.id === typeId) || {
      id: typeId,
      label: typeId,
      icon: '✨',
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Proposals List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Active Proposals</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Plus size={20} />
            New Proposal
          </button>
        </div>

        {proposals.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
            No active proposals
          </div>
        ) : (
          proposals.map((proposal) => (
            <div
              key={proposal.id}
              onClick={() => setSelectedProposal(proposal)}
              className={`bg-white rounded-2xl shadow-lg p-4 sm:p-6 cursor-pointer transition hover:shadow-xl ${
                selectedProposal?.id === proposal.id ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-lg sm:text-xl shrink-0">
                    {getTypeInfo(proposal.type)?.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate">{proposal.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      By: {proposal.initiatorName}
                    </p>
                  </div>
                </div>
                <span className="self-start px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                  {getTypeInfo(proposal.type)?.label}
                </span>
              </div>

              <p className="text-sm sm:text-base text-gray-600 mb-4 break-words">{proposal.description}</p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                <div className="flex flex-wrap gap-3 sm:gap-6">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-green-600 text-xs sm:text-sm">
                    <ThumbsUp size={16} />
                    <span>Approve: {proposal.approveCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-red-600 text-xs sm:text-sm">
                    <ThumbsDown size={16} />
                    <span>Reject: {proposal.rejectCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-yellow-600 text-xs sm:text-sm">
                    <MessageSquare size={16} />
                    <span>Modify: {proposal.modifyCount || 0}</span>
                  </div>
                </div>
                <span className="text-gray-500 text-xs sm:text-sm">
                  {new Date(proposal.createdAt).toLocaleDateString('en-US')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Panel */}
      <div className="lg:col-span-1">
        {selectedProposal ? (
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-32">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Proposal Details</h3>

            <div className="space-y-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Title</p>
                <p className="font-semibold text-gray-800">{selectedProposal.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="text-gray-800">{selectedProposal.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-semibold text-gray-800">
                  {getTypeInfo(selectedProposal.type)?.label}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Initiated by</p>
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={selectedProposal.initiatorAvatar}
                    alt={selectedProposal.initiatorName}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="font-semibold text-gray-800">
                    {selectedProposal.initiatorName}
                  </span>
                </div>
              </div>
            </div>

            {/* 管理员直接批准按钮 */}
            {currentUser.role === 'employee_admin' && selectedProposal.status !== 'approved' && (
              <button
                className="w-full mb-4 bg-gradient-to-r from-green-500 to-blue-500 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('/api/proposals', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ proposalId: selectedProposal.id, action: 'approve', userId: currentUser.id })
                    });
                    if (res.ok) {
                      fetchProposals();
                      setSelectedProposal({ ...selectedProposal, status: 'approved' });
                    }
                  } catch (e) {
                    // 可加错误提示
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? 'Approving...' : 'Approve Directly (Admin)'}
              </button>
            )}

            {/* Vote history */}
            {votes.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Vote History</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {votes.map((vote) => (
                    <div key={vote.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">{vote.name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          vote.voteType === 'approve' ? 'bg-green-100 text-green-700' :
                          vote.voteType === 'reject' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {vote.voteType === 'approve' ? 'Approve' : vote.voteType === 'reject' ? 'Reject' : 'Suggest Modify'}
                        </span>
                      </div>
                      {vote.comment && (
                        <p className="text-xs text-gray-600 mt-1">{vote.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentUser.id !== selectedProposal.initiatorId && (
              <button
                onClick={() => setShowVoteForm(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:shadow-lg transition font-semibold"
              >
                Vote
              </button>
            )}

            {currentUser.id === selectedProposal.initiatorId && (
              <button
                onClick={() => {
                  setEditData({
                    title: selectedProposal.title,
                    description: selectedProposal.description,
                    content: {}
                  });
                  setShowEditForm(true);
                }}
                className="w-full bg-orange-500 text-white px-4 py-3 rounded-lg hover:shadow-lg transition font-semibold flex items-center justify-center gap-2"
              >
                <Edit2 size={18} />
                Edit Proposal
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">
            Select a proposal to view details
          </div>
        )}
      </div>

      {/* Create Proposal Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">New Proposal</h3>

            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Proposal Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  {PROPOSAL_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                  <option value="custom">✨ Custom</option>
                </select>

                {formData.type === 'custom' && (
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Enter custom topic"
                    className="mt-3 w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter proposal title"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter proposal description"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Proposal Modal */}
      {showEditForm && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit Proposal</h3>
            <p className="text-sm text-orange-600 mb-4 bg-orange-50 p-3 rounded-lg">
              Editing this proposal will retain existing votes, but all members will be re-notified.
            </p>

            <form onSubmit={handleEditProposal} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Enter proposal title"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Enter proposal description"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vote Modal */}
      {showVoteForm && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Cast Your Vote</h3>

            <form onSubmit={handleVote} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Position
                </label>
                <div className="space-y-3">
                  {[
                    { id: 'approve', label: '👍 Approve', color: 'green', desc: 'I agree with this proposal' },
                    { id: 'reject', label: '👎 Reject', color: 'red', desc: 'I disagree with this proposal' },
                    { id: 'modify', label: '💬 Suggest Modification', color: 'yellow', desc: 'I suggest revising before approval' }
                  ].map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                        voteData.voteType === option.id
                          ? option.id === 'approve' ? 'border-green-500 bg-green-50' :
                            option.id === 'reject' ? 'border-red-500 bg-red-50' :
                            'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="voteType"
                        value={option.id}
                        checked={voteData.voteType === option.id}
                        onChange={(e) => setVoteData({ ...voteData, voteType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-gray-800">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comment (Optional)
                </label>
                <textarea
                  value={voteData.comment}
                  onChange={(e) => setVoteData({ ...voteData, comment: e.target.value })}
                  placeholder="Enter your reason or suggestion (optional)"
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVoteForm(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Vote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
